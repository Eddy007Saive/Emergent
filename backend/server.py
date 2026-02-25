from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone
from openai import OpenAI
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client - using Emergent LLM API
openai_client = OpenAI(
    api_key=os.environ.get('OPENAI_API_KEY'),
    base_url="https://llm.emergentmind.com/v1"
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


# Diagnostic Models
class UserInfo(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    city: str
    units: str

class DiagnosticRequest(BaseModel):
    userInfo: UserInfo
    answers: Dict[str, int]
    scores: Dict[str, int]

class DiagnosticResponse(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    city: str
    units: str
    segment: str
    score: int
    structureScore: int
    acquisitionScore: int
    valueScore: int
    diagSummary: str
    mainBlocker: str
    priority: str
    goodtimeRecommendation: str


# Questions data for context
QUESTIONS_CONTEXT = """
BLOC 1 - STRUCTURE INTERNE (Q1-Q10, max 20 pts):
- Q1: Rôle au quotidien (opérationnel vs pilotage)
- Q2: Capacité à s'absenter 10 jours
- Q3: Clarté des rôles et responsabilités
- Q4: Répartition des fonctions clés
- Q5: Process écrits pour situations critiques
- Q6: Gestion des tâches (outils)
- Q7: Qualité du stack outils (PMS, automatisations)
- Q8: Synchronisation des informations
- Q9: Vision logement par logement (performance)
- Q10: Suivi des indicateurs clés (CA, marge, occupation)

BLOC 2 - MOTEUR D'ACQUISITION (Q11-Q19, max 18 pts):
- Q11: Origine des nouveaux propriétaires
- Q12: Capacité d'absorption de nouveaux logements
- Q13: Site internet (SEO local)
- Q14: Fiche Google My Business
- Q15: Réseaux sociaux côté propriétaires
- Q16: Gestion des leads propriétaires (CRM)
- Q17: Nurturing des "pas maintenant"
- Q18: Maîtrise des chiffres d'acquisition
- Q19: Prévisibilité globale de l'acquisition

BLOC 3 - VALEUR & REVENDABILITÉ (Q20-Q22, max 6 pts):
- Q20: Dépendance à la personne du gérant
- Q21: Qualité du portefeuille propriétaires (contrats)
- Q22: Regard d'un banquier/investisseur sur le business

SCORING:
- 0 = situation problématique/artisanale
- 1 = en cours de structuration mais fragile
- 2 = bien structuré/professionnel

SEGMENTS:
- 0-18 pts: "artisanal" (conciergerie artisanale fragile)
- 19-32 pts: "transition" (entreprise en transition)
- 33-44 pts: "machine" (machine en devenir)
"""


def generate_analysis_prompt(user_info: UserInfo, answers: Dict[str, int], scores: Dict[str, int]) -> str:
    """Generate the prompt for GPT analysis"""
    
    # Determine segment
    total_score = scores.get('total', 0)
    if total_score <= 18:
        segment = "artisanal"
    elif total_score <= 32:
        segment = "transition"
    else:
        segment = "machine"
    
    # Build answers summary
    answers_summary = []
    for q_id, value in sorted(answers.items(), key=lambda x: int(x[0])):
        answers_summary.append(f"Q{q_id}: {value}/2")
    
    prompt = f"""Tu es un expert en structuration de conciergeries Airbnb/location courte durée.

Analyse ce diagnostic pour {user_info.firstName} {user_info.lastName} :

PROFIL:
- Ville: {user_info.city}
- Logements gérés: {user_info.units}

SCORES:
- Total: {scores.get('total', 0)}/44
- Structure interne: {scores.get('structure', 0)}/20
- Moteur d'acquisition: {scores.get('acquisition', 0)}/18  
- Valeur & revendabilité: {scores.get('value', 0)}/6

RÉPONSES DÉTAILLÉES:
{chr(10).join(answers_summary)}

CONTEXTE DES QUESTIONS:
{QUESTIONS_CONTEXT}

SEGMENT DÉTERMINÉ: {segment}

Génère une analyse personnalisée en français avec:

1. "diagSummary": 2-3 phrases qui résument la situation actuelle de manière directe et personnalisée (utilise le prénom)

2. "mainBlocker": le principal blocage identifié en 2-6 mots maximum

3. "priority": la priorité n°1 à traiter sur 90 jours (1 phrase concrète)

4. "goodtimeRecommendation": 3-5 phrases expliquant comment Goodtime peut aider concrètement (structuration + moteur d'acquisition local)

Ton: professionnel, direct, orienté business, pas "fun" ni enfantin. Sois franc et lucide.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans ```json):
{{
  "diagSummary": "...",
  "mainBlocker": "...",
  "priority": "...",
  "goodtimeRecommendation": "..."
}}"""
    
    return prompt, segment


async def analyze_diagnostic(user_info: UserInfo, answers: Dict[str, int], scores: Dict[str, int]) -> dict:
    """Generate comprehensive analysis based on scores"""
    
    total_score = scores.get('total', 0)
    structure_score = scores.get('structure', 0)
    acquisition_score = scores.get('acquisition', 0)
    value_score = scores.get('value', 0)
    
    # Determine segment
    if total_score <= 18:
        segment = "artisanal"
    elif total_score <= 32:
        segment = "transition"
    else:
        segment = "machine"
    
    first_name = user_info.firstName
    units = user_info.units if user_info.units else "plusieurs"
    
    # Calculate percentages for detailed analysis
    structure_pct = round((structure_score / 20) * 100)
    acquisition_pct = round((acquisition_score / 18) * 100)
    value_pct = round((value_score / 6) * 100)
    
    # Identify weakest and strongest areas
    scores_map = {
        "structure": structure_pct,
        "acquisition": acquisition_pct,
        "value": value_pct
    }
    weakest = min(scores_map, key=scores_map.get)
    strongest = max(scores_map, key=scores_map.get)
    
    # ============================================
    # ANALYSE DÉTAILLÉE PAR SEGMENT
    # ============================================
    
    if segment == "artisanal":
        # --- SEGMENT ARTISANAL (0-18 points) ---
        diag_summary = f"""{first_name}, soyons francs : aujourd'hui, tu n'as pas une entreprise. Tu as un job que tu t'es créé, certes avec plus de flexibilité qu'un salarié, mais qui te bouffe ton temps, ton énergie, et qui ne vaut presque rien si tu décides de passer à autre chose demain.

Avec un score de {total_score}/44, ta conciergerie repose entièrement sur toi. Si tu disparais 2 semaines, tout s'écroule. Ce n'est pas une entreprise, c'est une dépendance."""

        main_blocker = "Tu ES le système au lieu de le piloter"
        
        priority = "Sortir de l'opérationnel en documentant tes 3 process critiques et en déléguant au moins une fonction clé dans les 90 prochains jours."
        
        # Analyse Structure
        structure_analysis = {
            "score": f"{structure_score}/20",
            "percentage": structure_pct,
            "status": "critique" if structure_pct < 40 else "fragile",
            "diagnostic": f"""Ton organisation interne est ton plus gros frein. Tu passes probablement 80% de ton temps dans l'opérationnel : gérer les voyageurs, éteindre des feux, courir après le ménage, répondre aux propriétaires.

Résultat : tu n'as jamais le temps de travailler SUR ton business au lieu de travailler DANS ton business.

Ce que ça te coûte concrètement :
• Des nuits et week-ends sacrifiés pour des urgences qui pourraient être évitées
• Une croissance bridée : tu ne peux pas prendre plus de logements car tu es déjà au max
• Un épuisement qui s'accumule et qui finira par te rattraper
• Zéro valorisation : sans toi, ta conciergerie ne vaut rien""",
            "quickWins": [
                "Documente ta checklist ménage en 1h - c'est la tâche qui te prend le plus de temps",
                "Crée un message type pour les 5 questions voyageurs les plus fréquentes",
                "Identifie LA personne qui pourrait te remplacer sur UNE tâche cette semaine"
            ]
        }
        
        # Analyse Acquisition
        acquisition_analysis = {
            "score": f"{acquisition_score}/18",
            "percentage": acquisition_pct,
            "status": "inexistant" if acquisition_pct < 30 else "aléatoire",
            "diagnostic": f"""Tu vis au rythme du hasard. Tes nouveaux propriétaires arrivent par bouche-à-oreille, par chance, ou parce que tu as croisé quelqu'un au bon moment.

Ce n'est pas un moteur d'acquisition, c'est de la loterie.

Le problème : tu ne contrôles pas ta croissance. Un mois tu signes 3 propriétaires, le mois suivant zéro. Tu ne peux pas prévoir, pas planifier, pas investir sereinement.

Ce que font les conciergeries structurées :
• Elles ont un site web optimisé qui capte des leads locaux chaque semaine
• Leur fiche Google Business génère des appels entrants réguliers
• Elles ont un process de suivi des leads qui ne laisse personne filer""",
            "quickWins": [
                "Crée ou optimise ta fiche Google Business cette semaine",
                "Demande un avis Google à tes 3 meilleurs propriétaires",
                "Note dans un tableau tous les leads reçus ce mois-ci et leur origine"
            ]
        }
        
        # Analyse Valeur
        value_analysis = {
            "score": f"{value_score}/6",
            "percentage": value_pct,
            "status": "nulle" if value_pct < 40 else "très faible",
            "diagnostic": f"""Parlons cash : combien vaut ta conciergerie aujourd'hui si tu veux la vendre ?

La réponse honnête : presque rien. Peut-être quelques mois de chiffre d'affaires, au mieux.

Pourquoi ? Parce qu'un acheteur potentiel voit :
• Une activité qui dépend à 100% de toi
• Des propriétaires qui sont "tes" clients, pas ceux de l'entreprise
• Aucun process documenté, aucune organisation reproductible
• Zéro prévisibilité sur l'acquisition de nouveaux logements

Compare avec une conciergerie structurée qui se vend 3 à 5x son CA annuel :
• Des process clairs que n'importe qui peut suivre
• Des contrats propriétaires solides avec la structure, pas avec une personne
• Un moteur d'acquisition qui génère des leads prévisibles
• Un gérant qui pilote au lieu de tout faire lui-même""",
            "quickWins": [
                "Fais signer des contrats en bonne et due forme à tous tes propriétaires",
                "Crée une adresse email pro (contact@taconciergerie.fr) pour toutes les communications",
                "Commence à parler de 'nous' et de 'l'équipe' même si tu es seul"
            ]
        }
        
        # Estimation valorisation
        valorisation = {
            "actuelle": "0.5x à 1x le CA annuel (si vendable)",
            "potentielle": "2.5x à 4x le CA annuel avec structuration",
            "ecart": "Tu laisses potentiellement 2 à 3 années de CA sur la table",
            "explication": "Une conciergerie artisanale se vend difficilement car l'acheteur achète un job, pas un actif. Une conciergerie structurée avec process et acquisition prévisible est un actif qui génère des revenus sans dépendre d'une seule personne."
        }
        
        # Roadmap 12 mois
        roadmap = {
            "titre": "Ton plan de transformation sur 12 mois",
            "phases": [
                {
                    "periode": "Mois 1-3 : Stabilisation",
                    "objectif": "Sortir la tête de l'eau",
                    "actions": [
                        "Documenter les 5 process critiques (ménage, check-in, incidents, onboarding proprio, création annonce)",
                        "Recruter ou former une personne pour déléguer le ménage ou le check-in",
                        "Créer des templates de communication pour gagner 5h/semaine"
                    ]
                },
                {
                    "periode": "Mois 4-6 : Structuration",
                    "objectif": "Créer une vraie organisation",
                    "actions": [
                        "Mettre en place un outil de gestion des tâches centralisé",
                        "Définir des rôles clairs (même si tu cumules plusieurs casquettes)",
                        "Créer un tableau de bord avec tes KPIs clés (CA/logement, taux d'occupation, marge)"
                    ]
                },
                {
                    "periode": "Mois 7-9 : Acquisition",
                    "objectif": "Installer un moteur de croissance",
                    "actions": [
                        "Optimiser ton site web pour le SEO local",
                        "Activer ta fiche Google Business et collecter 20+ avis",
                        "Créer un process de suivi des leads (CRM simple)"
                    ]
                },
                {
                    "periode": "Mois 10-12 : Valorisation",
                    "objectif": "Construire un actif",
                    "actions": [
                        "Formaliser tous les contrats propriétaires",
                        "Préparer un dossier de présentation de ta conciergerie",
                        "Calculer ta vraie rentabilité par logement"
                    ]
                }
            ]
        }
        
        recommendation = f"""Goodtime accompagne les gérants comme toi à transformer leur conciergerie artisanale en vraie entreprise structurée.

Notre méthode en 4 piliers :

1. STRUCTURATION OPÉRATIONNELLE
On t'aide à documenter tes process, mettre en place les bons outils, et surtout à DÉLÉGUER pour que tu arrêtes d'être le pompier de service.

2. MOTEUR D'ACQUISITION LOCAL  
On installe un système qui génère des leads propriétaires chaque mois : SEO local, Google Business optimisé, stratégie de contenu ciblée.

3. PILOTAGE PAR LES CHIFFRES
On met en place les tableaux de bord qui te permettent de savoir exactement où tu en es et où tu vas.

4. VALORISATION PATRIMONIALE
On structure ton activité pour qu'elle devienne un actif vendable, finançable, et qui peut tourner sans toi.

Résultat : en 12 mois, tu passes d'un job qui te bouffe à une entreprise qui te rapporte et que tu pourrais revendre."""

    elif segment == "transition":
        # --- SEGMENT TRANSITION (19-32 points) ---
        diag_summary = f"""{first_name}, tu as compris quelque chose d'important : une conciergerie, c'est un business, pas juste une activité.

Tu as commencé à mettre des choses en place. Score de {total_score}/44 : tu es clairement au-dessus de la moyenne du marché. Mais tu ressens probablement un plafond de verre.

Tu voudrais scaler, prendre plus de logements, peut-être recruter... mais quelque chose bloque. Les trous dans la raquette t'empêchent d'avancer sereinement."""

        # Determine main blocker based on weakest area
        if weakest == "acquisition":
            main_blocker = "Ton acquisition reste trop dépendante du hasard"
        elif weakest == "structure":
            main_blocker = "Ta structure n'est pas assez solide pour scaler"
        else:
            main_blocker = "Ta conciergerie dépend encore trop de toi"
        
        priority = f"Consolider ton point faible ({weakest}) avant de chercher à grandir, sinon tu vas exploser en vol."
        
        # Analyse Structure
        if structure_pct >= 50:
            structure_status = "en place mais perfectible"
            structure_diag = f"""Ta structure commence à tenir. Tu as des process, probablement un début d'équipe ou de prestataires fiables, et tu arrives à te dégager un peu de l'opérationnel.

Mais attention : {100-structure_pct}% du chemin reste à faire. Les situations de crise te replongent encore dans l'opérationnel, et ta structure ne tiendrait probablement pas si tu t'absentais un mois.

Ce qui te manque pour passer au niveau supérieur :
• Des process vraiment documentés et utilisés par tous
• Une vision claire de la performance de chaque logement
• Un suivi régulier de tes indicateurs clés"""
        else:
            structure_status = "encore fragile"
            structure_diag = f"""Tu as posé des bases mais ta structure reste fragile. Au moindre imprévu, tu replonges dans l'opérationnel.

Le risque : tu t'épuises à vouloir faire grandir quelque chose qui n'a pas les fondations pour supporter la charge. C'est comme construire un étage supplémentaire sur une maison dont les murs ne sont pas solides.

Avant de penser croissance, il faut consolider :
• Documenter et faire appliquer tes process critiques
• Clarifier les rôles (même si tu portes plusieurs casquettes)
• Mettre en place un vrai pilotage par les chiffres"""
        
        structure_analysis = {
            "score": f"{structure_score}/20",
            "percentage": structure_pct,
            "status": structure_status,
            "diagnostic": structure_diag,
            "quickWins": [
                "Audite tes 5 process critiques : sont-ils vraiment documentés ET utilisés ?",
                "Crée un rituel hebdo de 30min pour suivre tes KPIs",
                "Identifie les 2-3 tâches qui te replongent encore dans l'opérationnel"
            ]
        }
        
        # Analyse Acquisition
        if acquisition_pct >= 50:
            acquisition_status = "des bases existent"
            acquisition_diag = f"""Tu as quelques canaux d'acquisition qui fonctionnent. C'est mieux que la majorité des conciergeries qui vivent uniquement du bouche-à-oreille.

Mais avec {acquisition_score}/18, ton moteur d'acquisition n'est pas encore prévisible. Tu ne sais probablement pas combien de leads tu vas recevoir le mois prochain, ni quel sera ton taux de conversion.

Pour passer au niveau supérieur :
• Identifier et doubler ce qui fonctionne déjà
• Créer un vrai pipeline de suivi des leads
• Calculer ton coût d'acquisition par propriétaire signé"""
        else:
            acquisition_status = "sous-exploité"
            acquisition_diag = f"""Ton acquisition est ton point faible. Tu as peut-être un site web, une fiche Google, mais ça ne génère pas de leads réguliers.

C'est frustrant : tu sais que des propriétaires cherchent des conciergeries dans ta zone, mais ils ne te trouvent pas. Ils vont chez la concurrence ou ils restent sur Airbnb en direct.

Ce que ça te coûte :
• Une croissance au ralenti alors que le marché est là
• Une dépendance au bouche-à-oreille qui peut s'arrêter du jour au lendemain
• Des concurrents qui prennent les leads que tu devrais capter"""
        
        acquisition_analysis = {
            "score": f"{acquisition_score}/18",
            "percentage": acquisition_pct,
            "status": acquisition_status,
            "diagnostic": acquisition_diag,
            "quickWins": [
                "Calcule combien de leads tu as reçus les 3 derniers mois et leur origine",
                "Optimise ta fiche Google Business (photos, description, posts réguliers)",
                "Mets en place un tableau de suivi des leads avec étapes de conversion"
            ]
        }
        
        # Analyse Valeur
        if value_pct >= 50:
            value_status = "potentiel existant"
            value_diag = f"""Tu as commencé à construire quelque chose qui a de la valeur. Des contrats existent, une certaine indépendance vis-à-vis de ta personne commence à se dessiner.

Mais avec {value_score}/6, tu n'es pas encore dans la zone où un investisseur ou un acheteur dirait "je veux ça".

Pour augmenter ta valorisation :
• Formaliser tous tes contrats avec des engagements clairs
• Réduire encore ta présence dans les relations propriétaires
• Documenter ton modèle pour qu'il soit reproductible"""
        else:
            value_status = "à construire"
            value_diag = f"""Aujourd'hui, ta conciergerie repose encore beaucoup sur toi. Un acheteur potentiel verrait :
• Une activité qui tourne, mais avec des dépendances
• Des propriétaires attachés à toi plus qu'à la structure
• Un potentiel, mais du travail à faire pour le débloquer

La bonne nouvelle : tu as les bases. En 6-12 mois de travail ciblé, tu peux multiplier ta valorisation par 2 ou 3."""
        
        value_analysis = {
            "score": f"{value_score}/6",
            "percentage": value_pct,
            "status": value_status,
            "diagnostic": value_diag,
            "quickWins": [
                "Revois tous tes contrats propriétaires : sont-ils au nom de ta structure ?",
                "Crée une présentation de ta conciergerie comme si tu devais la vendre",
                "Calcule ta vraie marge par logement (pas juste le CA)"
            ]
        }
        
        # Estimation valorisation
        valorisation = {
            "actuelle": "1.5x à 2.5x le CA annuel",
            "potentielle": "3x à 5x le CA annuel avec optimisation",
            "ecart": f"Potentiel d'augmentation de 50% à 100% de la valorisation",
            "explication": "Tu as dépassé le stade artisanal mais tu n'as pas encore atteint le niveau 'machine'. C'est la zone où le travail de structuration a le plus d'impact sur la valorisation."
        }
        
        # Roadmap 12 mois
        roadmap = {
            "titre": "Ton plan d'accélération sur 12 mois",
            "phases": [
                {
                    "periode": "Mois 1-3 : Consolidation",
                    "objectif": f"Renforcer ton point faible : {weakest}",
                    "actions": [
                        f"Audit complet de ta {weakest} actuelle",
                        "Plan d'action ciblé sur les 3 quick wins prioritaires",
                        "Mise en place des outils manquants"
                    ]
                },
                {
                    "periode": "Mois 4-6 : Systématisation",
                    "objectif": "Créer des systèmes qui tournent sans toi",
                    "actions": [
                        "Automatiser tout ce qui peut l'être",
                        "Former ton équipe/prestataires sur les process",
                        "Installer un rituel de pilotage hebdomadaire"
                    ]
                },
                {
                    "periode": "Mois 7-9 : Croissance maîtrisée",
                    "objectif": "Scaler sur des bases solides",
                    "actions": [
                        "Activer ton moteur d'acquisition à plein régime",
                        "Recruter ou structurer pour absorber la croissance",
                        "Optimiser ta marge par logement"
                    ]
                },
                {
                    "periode": "Mois 10-12 : Optimisation",
                    "objectif": "Maximiser la valeur",
                    "actions": [
                        "Affiner tous les process pour l'excellence opérationnelle",
                        "Préparer un dossier de valorisation complet",
                        "Définir ta stratégie long terme (scale, revente, levée)"
                    ]
                }
            ]
        }
        
        recommendation = f"""Goodtime travaille avec les conciergeries en transition comme la tienne pour franchir le cap décisif.

Tu as déjà les bases - maintenant il faut structurer pour scaler.

Notre accompagnement pour ton profil :

1. DIAGNOSTIC APPROFONDI
On identifie précisément ce qui bloque ta croissance et on priorise les chantiers.

2. CONSOLIDATION CIBLÉE
On renforce ton point faible ({weakest}) avec des méthodes éprouvées sur des dizaines de conciergeries.

3. MOTEUR D'ACQUISITION
On installe ou on optimise ton système d'acquisition pour que tu aies des leads prévisibles chaque mois.

4. PRÉPARATION AU SCALE
On structure ton organisation pour qu'elle absorbe la croissance sans que tu replonges dans l'opérationnel.

Résultat : en 12 mois, tu passes du plafond de verre à une croissance maîtrisée, avec une valorisation qui double."""

    else:
        # --- SEGMENT MACHINE (33-44 points) ---
        diag_summary = f"""{first_name}, félicitations. Avec {total_score}/44, tu fais partie du top 10% des gérants de conciergerie.

Tu as compris que ce métier, c'est un business. Tu as structuré, tu as délégué, tu as mis en place des process. Ta conciergerie tourne même quand tu n'es pas là.

Maintenant, la question c'est : que veux-tu en faire ? Scaler massivement ? Optimiser pour maximiser la marge ? Préparer une revente ? Lever des fonds ?"""

        main_blocker = "Définir ta stratégie de sortie ou de scale"
        
        priority = "Clarifier ta vision à 3-5 ans et aligner ton organisation sur cet objectif."
        
        # Analyse Structure
        structure_analysis = {
            "score": f"{structure_score}/20",
            "percentage": structure_pct,
            "status": "solide" if structure_pct >= 70 else "mature",
            "diagnostic": f"""Ta structure est clairement au-dessus de la moyenne. Tu as des process, une équipe ou des prestataires qui fonctionnent, et tu peux t'absenter sans que tout s'écroule.

Les axes d'optimisation pour aller encore plus loin :
• Industrialiser ce qui peut encore l'être
• Créer des indicateurs avancés (pas juste du reporting, du prédictif)
• Préparer ta structure à absorber un doublement de volume

À ton niveau, chaque point d'optimisation a un impact direct sur ta valorisation.""",
            "quickWins": [
                "Identifie les 2-3 process qui ne sont pas encore au niveau industriel",
                "Mets en place un dashboard temps réel de tes KPIs clés",
                "Crée un plan de capacité : combien de logements tu peux absorber sans recrutement ?"
            ]
        }
        
        # Analyse Acquisition
        acquisition_analysis = {
            "score": f"{acquisition_score}/18",
            "percentage": acquisition_pct,
            "status": "performant" if acquisition_pct >= 70 else "établi",
            "diagnostic": f"""Tu as un moteur d'acquisition qui fonctionne. Des leads arrivent, tu convertis, tu grandis.

La question maintenant : comment passer à l'échelle supérieure ?

Options pour accélérer :
• Acquisition payante (Google Ads, Facebook Ads ciblé propriétaires)
• Partenariats stratégiques (agents immobiliers, notaires, promoteurs)
• Expansion géographique avec réplication de ton modèle
• Rachat de portefeuilles de conciergeries moins structurées""",
            "quickWins": [
                "Calcule ton CAC (coût d'acquisition client) précis par canal",
                "Teste un budget pub de 500€ sur 30 jours pour valider le canal payant",
                "Identifie 5 partenaires potentiels à contacter ce mois-ci"
            ]
        }
        
        # Analyse Valeur
        value_analysis = {
            "score": f"{value_score}/6",
            "percentage": value_pct,
            "status": "élevé" if value_pct >= 70 else "bon",
            "diagnostic": f"""Ta conciergerie a une vraie valeur patrimoniale. Ce n'est plus un job, c'est un actif.

Un acheteur ou investisseur verrait :
• Une structure qui tourne de façon autonome
• Des process documentés et reproductibles
• Un moteur d'acquisition prévisible
• Des contrats solides avec les propriétaires

Pour maximiser ta valorisation :
• Documenter tout ce qui rend ton modèle unique et réplicable
• Optimiser ta marge nette (c'est sur ça qu'on te valorise)
• Préparer un data room complet pour les due diligences""",
            "quickWins": [
                "Crée un mémo de présentation de ta conciergerie (10 pages max)",
                "Calcule ton EBITDA réel (en te versant un salaire de marché)",
                "Liste ce qui te différencie de la concurrence en 5 points"
            ]
        }
        
        # Estimation valorisation
        valorisation = {
            "actuelle": "3x à 5x le CA annuel (ou 5-8x l'EBITDA)",
            "potentielle": "5x à 8x le CA annuel avec optimisation",
            "ecart": "Potentiel d'augmentation de 30% à 60% avec les bons leviers",
            "explication": "À ton niveau, la valorisation dépend surtout de la qualité de ton EBITDA, de la prévisibilité de ta croissance, et de la solidité de tes contrats. Chaque point d'optimisation compte."
        }
        
        # Roadmap 12 mois
        roadmap = {
            "titre": "Ton plan d'optimisation et de scale sur 12 mois",
            "phases": [
                {
                    "periode": "Mois 1-3 : Clarification stratégique",
                    "objectif": "Définir ta vision et ton plan",
                    "actions": [
                        "Clarifier ton objectif : scale, revente, ou optimisation ?",
                        "Faire une valorisation précise de ta conciergerie",
                        "Identifier les leviers à activer en priorité"
                    ]
                },
                {
                    "periode": "Mois 4-6 : Optimisation",
                    "objectif": "Maximiser marge et efficacité",
                    "actions": [
                        "Renégocier tes contrats prestataires",
                        "Optimiser ta tarification et tes commissions",
                        "Automatiser les derniers process manuels"
                    ]
                },
                {
                    "periode": "Mois 7-9 : Accélération",
                    "objectif": "Activer les leviers de croissance",
                    "actions": [
                        "Lancer ton moteur d'acquisition payante",
                        "Développer les partenariats stratégiques",
                        "Préparer la structure pour absorber la croissance"
                    ]
                },
                {
                    "periode": "Mois 10-12 : Valorisation",
                    "objectif": "Préparer la sortie ou le refinancement",
                    "actions": [
                        "Constituer un data room complet",
                        "Solliciter des valorisations ou des offres",
                        "Négocier en position de force"
                    ]
                }
            ]
        }
        
        recommendation = f"""Goodtime travaille avec les conciergeries matures comme la tienne sur des sujets de scale et de valorisation.

À ton niveau, on ne parle plus de "structurer" mais d'"optimiser" et de "maximiser".

Notre accompagnement premium :

1. STRATÉGIE DE SORTIE
On t'aide à clarifier ton objectif : scale massif, revente à un consolidateur, levée de fonds, ou optimisation patrimoniale.

2. OPTIMISATION FINANCIÈRE
On travaille sur ta marge, ta structure de coûts, et ta valorisation pour maximiser ce que tu extrais de ton business.

3. SCALE ACCÉLÉRÉ
Si tu veux grandir vite, on active les leviers : acquisition payante, partenariats, expansion géographique, rachats.

4. PRÉPARATION TRANSACTION
Si tu vises une revente, on prépare ton dossier, on identifie les acheteurs, et on t'accompagne dans la négo.

Tu as construit quelque chose de solide. Voyons ensemble comment en tirer le maximum."""

    return {
        "segment": segment,
        "diagSummary": diag_summary,
        "mainBlocker": main_blocker,
        "priority": priority,
        "structureAnalysis": structure_analysis,
        "acquisitionAnalysis": acquisition_analysis,
        "valueAnalysis": value_analysis,
        "valorisation": valorisation,
        "roadmap": roadmap,
        "goodtimeRecommendation": recommendation
    }


# API Routes
@api_router.get("/")
async def root():
    return {"message": "Goodtime Diagnostic API"}


@api_router.post("/diagnostic/analyze", response_model=DiagnosticResponse)
async def analyze_diagnostic_endpoint(request: DiagnosticRequest):
    """Analyze diagnostic answers and generate personalized recommendations"""
    
    # Get AI analysis
    analysis = await analyze_diagnostic(
        request.userInfo,
        request.answers,
        request.scores
    )
    
    # Build response
    response = DiagnosticResponse(
        firstName=request.userInfo.firstName,
        lastName=request.userInfo.lastName,
        email=request.userInfo.email,
        phone=request.userInfo.phone,
        city=request.userInfo.city,
        units=request.userInfo.units,
        segment=analysis['segment'],
        score=request.scores.get('total', 0),
        structureScore=request.scores.get('structure', 0),
        acquisitionScore=request.scores.get('acquisition', 0),
        valueScore=request.scores.get('value', 0),
        diagSummary=analysis['diagSummary'],
        mainBlocker=analysis['mainBlocker'],
        priority=analysis['priority'],
        goodtimeRecommendation=analysis['goodtimeRecommendation']
    )
    
    # Save to database
    try:
        doc = response.model_dump()
        doc['timestamp'] = datetime.now(timezone.utc).isoformat()
        doc['answers'] = request.answers
        await db.diagnostics.insert_one(doc)
    except Exception as e:
        logger.warning(f"Failed to save diagnostic to DB: {e}")
    
    return response


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
