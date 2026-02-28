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

# OpenAI client - using real OpenAI API
openai_client = OpenAI(
    api_key=os.environ.get('OPENAI_API_KEY')
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
    structureAnalysis: Optional[dict] = None
    acquisitionAnalysis: Optional[dict] = None
    valueAnalysis: Optional[dict] = None
    investmentLesson: Optional[dict] = None
    roadmap: Optional[dict] = None


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
    # GÉNÉRATION DE LA RECOMMANDATION PERSONNALISÉE
    # ============================================
    
    def generate_personalized_recommendation():
        """Génère une recommandation 100% personnalisée basée sur les scores réels"""
        
        sections = []
        
        # INTRO personnalisée selon le profil - TOUJOURS VALORISANTE
        if structure_pct >= 70 and acquisition_pct >= 70:
            intro = f"""🎯 CE QUE GOODTIME VA T'APPORTER

{first_name}, bravo pour le travail accompli. Avec {structure_score}/20 en structure et {acquisition_score}/18 en acquisition, tu fais partie des conciergeries les mieux organisées du marché.

Tu as construit des bases solides. La question maintenant : comment aller encore plus loin ? Comment passer de "ça tourne bien" à "ça cartonne" ?

On accompagne les conciergeries performantes comme la tienne pour maximiser leur potentiel et accélérer leur croissance."""
        
        elif structure_pct >= 60 and acquisition_pct < 50:
            intro = f"""🎯 CE QUE GOODTIME VA T'APPORTER

{first_name}, tu as fait un vrai travail de structuration ({structure_score}/20). C'est une base solide sur laquelle construire.

Le prochain levier de croissance pour toi, c'est l'acquisition ({acquisition_score}/18). Les propriétaires cherchent des conciergeries comme la tienne - il s'agit maintenant de te rendre visible auprès d'eux.

C'est exactement notre spécialité : construire des systèmes d'acquisition qui génèrent des leads qualifiés de façon prévisible."""
        
        elif structure_pct < 50 and acquisition_pct >= 60:
            intro = f"""🎯 CE QUE GOODTIME VA T'APPORTER

{first_name}, tu as une vraie force : tu sais attirer des propriétaires ({acquisition_score}/18 en acquisition). C'est un talent que beaucoup de conciergeries n'ont pas.

Pour capitaliser sur cette force, l'étape suivante est de renforcer ton organisation ({structure_score}/20). Ça te permettra d'absorber plus de volume sereinement et de libérer du temps pour ce que tu fais de mieux.

On va t'aider à consolider tes fondations pour que ta croissance soit fluide."""
        
        elif structure_pct < 40:
            intro = f"""🎯 CE QUE GOODTIME VA T'APPORTER

{first_name}, comme beaucoup de gérants de conciergerie, tu portes beaucoup de casquettes au quotidien. C'est normal quand on construit son activité.

La bonne nouvelle : il existe des méthodes éprouvées pour structurer ton organisation et te libérer du temps. C'est exactement ce qu'on fait chez Goodtime : on t'accompagne pour mettre en place des systèmes qui tournent, même quand tu n'es pas derrière.

Tu as déjà l'essentiel : l'expertise terrain et la connaissance de tes clients. On t'apporte la méthode et les outils."""
        
        else:
            intro = f"""🎯 CE QUE GOODTIME VA T'APPORTER

{first_name}, ton diagnostic révèle un profil avec de vraies opportunités de développement : {structure_score}/20 en structure, {acquisition_score}/18 en acquisition, {value_score}/6 en valeur.

On travaille avec des conciergeries à différents stades de maturité. Notre rôle : identifier les leviers de croissance les plus impactants pour TA situation et t'accompagner dans leur mise en place."""
        
        sections.append(intro)
        
        # SECTION STRUCTURE - adaptée au niveau
        if structure_pct < 60:
            structure_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 GAGNER DU TEMPS AU QUOTIDIEN

Avec {structure_score}/20 en structure, il y a une belle marge de progression pour te simplifier la vie.

Ce qu'on met en place avec toi :
• Des process clairs et simples que ton équipe/prestataires peuvent suivre facilement
• Un système de gestion centralisé qui te fait gagner des heures chaque semaine
• Une organisation où tu peux te concentrer sur ce qui compte vraiment

Notre équipe peut aussi prendre en charge certaines tâches (back-office, support) pour accélérer cette transition."""
            sections.append(structure_section)
        
        elif structure_pct >= 60 and structure_pct < 80:
            structure_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 OPTIMISER CE QUI FONCTIONNE

Ta structure est bien en place ({structure_score}/20). Il reste quelques ajustements pour la rendre encore plus efficace :
• Identifier et éliminer les derniers points de friction
• Automatiser ce qui peut encore l'être
• Préparer ton organisation à absorber plus de volume

On t'aide à passer de "ça fonctionne" à "c'est fluide et scalable"."""
            sections.append(structure_section)
        
        elif structure_pct >= 80:
            structure_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ UNE STRUCTURE SOLIDE

Avec {structure_score}/20, tu as fait un excellent travail d'organisation. C'est une vraie force.

On va capitaliser sur cette base pour travailler les autres leviers de croissance."""
            sections.append(structure_section)
        
        # SECTION ACQUISITION - adaptée au niveau
        if acquisition_pct < 40:
            acquisition_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 DÉVELOPPER TON ACQUISITION

Avec {acquisition_score}/18 en acquisition, c'est LE levier qui peut transformer ton activité.

C'est notre spécialité. On va CONSTRUIRE avec toi :
• Un site web optimisé qui te rend visible des propriétaires de {user_info.city}
• Une fiche Google Business qui génère des contacts réguliers
• Une stratégie de contenu qui te positionne comme une référence locale
• Un process de conversion pour transformer les contacts en clients

Ce système T'APPARTIENT. Et si tu préfères, on peut l'opérer pour toi."""
            sections.append(acquisition_section)
        
        elif acquisition_pct < 60:
            acquisition_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 STRUCTURER TON ACQUISITION

Avec {acquisition_score}/18, tu génères déjà des contacts. L'objectif maintenant : rendre ça prévisible.

On va structurer et amplifier ce qui fonctionne :
• Optimiser tes canaux actuels (SEO, Google Business, réseaux)
• Mettre en place un vrai suivi des prospects
• Activer de nouveaux canaux adaptés à {user_info.city}
• Créer de la régularité dans ton flux de nouveaux propriétaires"""
            sections.append(acquisition_section)
        
        elif acquisition_pct < 80:
            acquisition_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 AMPLIFIER TON ACQUISITION

Ton acquisition fonctionne bien ({acquisition_score}/18). L'opportunité : passer à l'échelle supérieure.

On peut activer des leviers plus puissants :
• Campagnes publicitaires ciblées propriétaires
• Partenariats stratégiques (agents immobiliers, notaires)
• Expansion géographique si tu veux sortir de {user_info.city}
• Automatisation pour convertir encore mieux"""
            sections.append(acquisition_section)
        
        else:
            acquisition_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ UNE ACQUISITION PERFORMANTE

Avec {acquisition_score}/18, ton système d'acquisition fonctionne très bien. Bravo !

On peut t'aider à l'optimiser (réduire le coût par contact, améliorer la conversion) ou à le dupliquer si tu veux t'étendre géographiquement."""
            sections.append(acquisition_section)
        
        # SECTION VALEUR - si pertinent
        if value_pct < 50:
            value_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 CONSTRUIRE UN ACTIF DURABLE

Avec {value_score}/6 en valeur, il y a une opportunité de renforcer la pérennité de ton activité.

On travaille sur :
• La formalisation de tes contrats propriétaires
• La création de process reproductibles
• La documentation de ton modèle pour qu'il soit solide dans la durée"""
            sections.append(value_section)
        
        # SECTION SYSTÈME GOODTIME
        systeme_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 LE SYSTÈME GOODTIME

On n'est pas des consultants qui donnent des conseils et disparaissent. On est des partenaires opérationnels.

Concrètement, on implémente chez toi :
• Nos outils éprouvés (process, templates, systèmes de gestion)
• Notre équipe si tu veux déléguer certaines fonctions
• Nos méthodes testées sur des dizaines de conciergeries

Tu n'es plus seul. Tu as une équipe qui travaille AVEC toi."""
        sections.append(systeme_section)
        
        # SECTION PROCESS
        process_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 COMMENT ÇA SE PASSE ?

1️⃣ APPEL DÉCOUVERTE (30 min)
On échange sur ta situation, tes objectifs, et on voit ensemble comment on peut t'aider.

2️⃣ AUDIT PERSONNALISÉ
On analyse en détail ta conciergerie pour identifier les meilleures opportunités.

3️⃣ PLAN D'ACTION SUR MESURE
Un plan adapté à TON profil avec des étapes claires sur 3 - 6 - 9 - 12 mois.

4️⃣ ACCOMPAGNEMENT
On déploie les outils, on t'accompagne dans la mise en place, et on ajuste en continu."""
        sections.append(process_section)
        
        # SECTION RÉSULTATS - personnalisée et positive
        if structure_pct < 50:
            resultats = """✅ Une organisation qui tourne de façon fluide
✅ Du temps libéré pour te concentrer sur le développement"""
        else:
            resultats = """✅ Une organisation encore plus efficace et scalable
✅ Plus de temps pour les projets stratégiques"""
        
        if acquisition_pct < 60:
            resultats += """
✅ Un flux régulier de nouveaux propriétaires intéressés
✅ Un système d'acquisition qui travaille pour toi"""
        else:
            resultats += """
✅ Une acquisition amplifiée et optimisée
✅ Une croissance maîtrisée et prévisible"""
        
        resultats += """
✅ Une activité solide et pérenne
✅ La sérénité d'avoir les bonnes fondations"""
        
        resultats_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 CE QUE TU PEUX ATTENDRE

En mettant en place les bonnes actions :
{resultats}"""
        sections.append(resultats_section)
        
        # SECTION CTA - positive et encourageante
        cta_section = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ ET MAINTENANT ?

Le marché de la location courte durée est en pleine croissance. Les propriétaires à {user_info.city} et ailleurs cherchent des conciergeries professionnelles sur qui compter.

Tu as déjà l'expertise terrain. Avec les bons outils et le bon accompagnement, tu peux vraiment passer au niveau supérieur.

Réserve ton appel découverte. C'est gratuit, sans engagement, et tu repartiras avec des idées concrètes pour avancer."""
        sections.append(cta_section)
        
        return "\n\n".join(sections)
    
    # Générer la recommandation personnalisée
    recommendation = generate_personalized_recommendation()
    
    # ============================================
    # CALCUL INTELLIGENT DU BLOCAGE ET PRIORITÉ
    # (Basé uniquement sur les scores - pas d'hallucination)
    # ============================================
    
    def calculate_main_blocker_and_priority():
        """Calcule le blocage principal et la priorité basés sur les scores réels"""
        
        # Cas 1: Scores excellents partout (>= 80% sur tout)
        if structure_pct >= 80 and acquisition_pct >= 80 and value_pct >= 80:
            return (
                "Aucun blocage majeur identifié",
                "Optimisation des coûts, expansion géographique, ou préparation à la valorisation/revente."
            )
        
        # Cas 2: Scores très bons (>= 70% sur tout)
        if structure_pct >= 70 and acquisition_pct >= 70 and value_pct >= 70:
            # Trouver le moins bon pour optimisation
            if acquisition_pct <= structure_pct and acquisition_pct <= value_pct:
                return (
                    "Optimisation du système d'acquisition",
                    "Amplifier et automatiser ton acquisition pour accélérer la croissance."
                )
            elif structure_pct <= acquisition_pct and structure_pct <= value_pct:
                return (
                    "Optimisation des process internes",
                    "Affiner et automatiser tes process pour gagner en efficacité."
                )
            else:
                return (
                    "Renforcement de la valorisation",
                    "Formaliser les éléments qui rendent ton entreprise autonome et valorisable."
                )
        
        # Cas 3: Un ou plusieurs domaines à améliorer - identifier le plus faible
        weakest_score = min(structure_pct, acquisition_pct, value_pct)
        
        if acquisition_pct == weakest_score and acquisition_pct < 60:
            return (
                "Développer un système d'acquisition prévisible",
                f"Mettre en place un moteur d'acquisition structuré pour générer des leads réguliers à {user_info.city}."
            )
        elif structure_pct == weakest_score and structure_pct < 60:
            return (
                "Structurer l'organisation interne",
                "Documenter les process clés et mettre en place des systèmes pour libérer du temps."
            )
        elif value_pct == weakest_score and value_pct < 60:
            return (
                "Construire une entreprise autonome",
                "Réduire la dépendance au gérant et formaliser les contrats pour créer un actif pérenne."
            )
        
        # Cas par défaut - prioriser l'acquisition (ton conseil)
        if acquisition_pct < 70:
            return (
                "Amplifier l'acquisition",
                "Structurer et accélérer ton système d'acquisition pour une croissance prévisible."
            )
        elif structure_pct < 70:
            return (
                "Optimiser l'organisation",
                "Renforcer les process pour absorber plus de volume sereinement."
            )
        else:
            return (
                "Préparer la valorisation",
                "Formaliser les éléments qui rendent ton entreprise autonome et attractive."
            )
    
    # Calculer mainBlocker et priority de façon cohérente
    calculated_blocker, calculated_priority = calculate_main_blocker_and_priority()
    
    # ============================================
    # GÉNÉRATION DU DIAGNOSTIC SUMMARY COHÉRENT
    # ============================================
    
    def generate_coherent_diag_summary():
        """Génère un résumé de diagnostic cohérent avec les scores"""
        
        # Cas 1: Excellence (>= 80% partout)
        if structure_pct >= 80 and acquisition_pct >= 80 and value_pct >= 80:
            return f"""{first_name}, félicitations ! Avec {total_score}/44, tu fais partie des conciergeries les plus structurées du marché.

Tu as mis en place une vraie organisation ({structure_score}/20), un système d'acquisition qui fonctionne ({acquisition_score}/18), et une entreprise qui peut tourner de façon autonome ({value_score}/6).

À ce stade, les opportunités sont l'optimisation des coûts, l'expansion géographique, ou la préparation d'une valorisation/revente si c'est dans tes projets."""
        
        # Cas 2: Très bon niveau (>= 70% partout)
        if structure_pct >= 70 and acquisition_pct >= 70:
            return f"""{first_name}, avec {total_score}/44, tu as construit une conciergerie solide.

Ton organisation est en place ({structure_score}/20), ton acquisition fonctionne ({acquisition_score}/18). Tu fais clairement partie des conciergeries au-dessus de la moyenne.

L'opportunité maintenant : optimiser ce qui existe et accélérer ta croissance sur des bases saines."""
        
        # Cas 3: Bon niveau structure, acquisition à développer
        if structure_pct >= 60 and acquisition_pct < 50:
            return f"""{first_name}, avec {total_score}/44, tu as une base organisationnelle solide ({structure_score}/20).

Le principal levier de croissance pour toi est l'acquisition ({acquisition_score}/18). Tu as la structure pour absorber plus de volume - il s'agit maintenant de mettre en place un système pour attirer des propriétaires de façon régulière."""
        
        # Cas 4: Bonne acquisition, structure à renforcer
        if acquisition_pct >= 60 and structure_pct < 50:
            return f"""{first_name}, avec {total_score}/44, tu as une vraie force : tu sais attirer des propriétaires ({acquisition_score}/18).

Pour capitaliser sur cette force, l'étape suivante est de renforcer ton organisation ({structure_score}/20). Ça te permettra d'absorber ta croissance sereinement et de libérer du temps pour le développement."""
        
        # Cas 5: Les deux à développer
        if structure_pct < 50 and acquisition_pct < 50:
            return f"""{first_name}, avec {total_score}/44, tu es au début de la structuration de ta conciergerie.

C'est une étape normale dans le développement d'une activité. Les deux leviers principaux pour toi sont l'organisation interne ({structure_score}/20) et l'acquisition ({acquisition_score}/18).

La bonne nouvelle : avec les bonnes méthodes, tu peux progresser rapidement sur ces deux axes."""
        
        # Cas par défaut
        return f"""{first_name}, avec {total_score}/44, ta conciergerie a des bases sur lesquelles construire.

Structure : {structure_score}/20 | Acquisition : {acquisition_score}/18 | Valeur : {value_score}/6

On va identifier ensemble les leviers les plus impactants pour ta situation."""
    
    # ============================================
    # ANALYSE DÉTAILLÉE PAR SEGMENT
    # ============================================
    
    if segment == "artisanal":
        # --- SEGMENT ARTISANAL (0-18 points) ---
        diag_summary = generate_coherent_diag_summary()
        main_blocker = calculated_blocker
        priority = calculated_priority
        
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
        
        # Leçon business sur l'investissement
        investment_lesson = {
            "titre": "La vérité que 95% des conciergeries refusent d'entendre",
            "message": f"""{first_name}, il faut qu'on parle cash.

Tu fais probablement partie des 95% de gérants de conciergerie qui considèrent l'investissement en communication et en acquisition comme une DÉPENSE. C'est l'erreur fatale qui condamne la majorité des conciergeries à rester des petites structures artisanales.

Voici la réalité : l'investissement en acquisition n'est PAS une dépense. C'est un ACTIF.

Pourquoi ? Parce que la conciergerie est un business de récurrent. Quand tu signes un propriétaire, tu ne le signes pas pour une prestation unique. Tu le signes pour des mois, voire des années de commissions récurrentes.

Fais le calcul :
• Un propriétaire te rapporte en moyenne 200-400€/mois de commission
• Sur 12 mois, c'est 2 400 à 4 800€ de revenus récurrents
• Sur 3 ans, c'est 7 200 à 14 400€

Maintenant, combien ça coûte d'acquérir ce propriétaire ? Avec un système d'acquisition bien structuré : 100 à 300€ maximum.

Le ROI est ÉNORME. Chaque euro investi en acquisition peut te rapporter 10, 20, voire 50 euros sur la durée de vie du client.

Pourtant, tu hésites à investir 500€/mois en communication ? C'est comme refuser de mettre de l'essence dans une voiture qui pourrait te rapporter des milliers d'euros.

Aucune entreprise sérieuse ne se développe sans investir dans sa croissance. C'est non négociable. Ce n'est pas une option, c'est une obligation si tu veux sortir du bricolage.""",
            "keyPoints": [
                "L'acquisition n'est pas une dépense, c'est un actif qui génère du récurrent",
                "Le ROI de l'acquisition en conciergerie est parmi les plus élevés du marché",
                "Ton ambition définit ton budget : plus tu veux grandir, plus tu dois investir",
                "Pas de croissance saine et prévisible sans investissement structuré"
            ]
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
                        "Mettre en place un système centralisé de gestion des tâches",
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
        
        # La recommandation est générée dynamiquement par generate_personalized_recommendation()
        # (voir plus haut dans le code)

    elif segment == "transition":
        # --- SEGMENT TRANSITION (19-32 points) ---
        diag_summary = generate_coherent_diag_summary()
        main_blocker = calculated_blocker
        priority = calculated_priority
        
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
        
        # Leçon business sur l'investissement
        investment_lesson = {
            "titre": "Ce qui sépare les conciergeries qui stagnent de celles qui explosent",
            "message": f"""{first_name}, tu es à un tournant.

Tu as posé des bases, tu as une activité qui fonctionne. Mais tu ressens ce plafond de verre. Et je vais te dire pourquoi tu n'arrives pas à le franchir.

95% des gérants de conciergerie font la même erreur : ils considèrent l'investissement en acquisition comme une dépense optionnelle. "Quand j'aurai plus de trésorerie, j'investirai dans la com." C'est exactement l'inverse qu'il faut faire.

La conciergerie est un business de RÉCURRENT. Chaque propriétaire signé te rapporte des commissions pendant des mois, voire des années. Un propriétaire acquis pour 200€ peut te rapporter 5 000€, 10 000€ ou plus sur sa durée de vie.

Le ROI de l'acquisition en conciergerie est parmi les plus élevés de tous les secteurs. Mais tu hésites à investir 1 000€/mois pour construire un moteur qui te rapportera 10x, 20x plus ?

Voici la vérité : ton ambition définit ton budget.
• Tu veux rester à ton niveau actuel ? Continue comme ça.
• Tu veux doubler, tripler ? Il faut investir proportionnellement.

Aucune entreprise sérieuse ne se développe sans investir dans sa croissance. Ce n'est pas un choix, c'est une loi du business.

La différence entre toi et les conciergeries qui cartonnent ? Elles ont compris que l'investissement en acquisition est un ACTIF, pas une charge. Plus tu construis un moteur d'acquisition puissant, plus tu vas chercher de nouveaux leads, plus ton entreprise prend de la valeur.""",
            "keyPoints": [
                "L'acquisition est un actif qui s'apprécie, pas une dépense qui disparaît",
                "Ton ambition définit ton budget d'investissement",
                "Le récurrent de la conciergerie rend le ROI de l'acquisition exceptionnel",
                "Pas de franchissement du plafond de verre sans investissement structuré"
            ]
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
                        "Mise en place d'un système opérationnel structuré"
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
        
        # La recommandation est générée dynamiquement par generate_personalized_recommendation()

    else:
        # --- SEGMENT MACHINE (33-44 points) ---
        diag_summary = generate_coherent_diag_summary()
        main_blocker = calculated_blocker
        priority = calculated_priority
        
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
        
        # Leçon business sur l'investissement
        investment_lesson = {
            "titre": "Le levier que même les meilleurs sous-exploitent",
            "message": f"""{first_name}, tu fais partie de l'élite. Mais même à ton niveau, il y a un levier que tu sous-exploites probablement.

Tu as structuré, tu as délégué, tu as des process. Mais est-ce que ton moteur d'acquisition est vraiment à la hauteur de tes ambitions ?

La plupart des conciergeries matures comme la tienne font une erreur : elles se reposent sur leur réputation et leur bouche-à-oreille. Ça fonctionne, mais ça ne scale pas.

Voici ce que font les conciergeries qui doublent ou triplent leur nombre de logements en 18 mois : elles investissent MASSIVEMENT dans l'acquisition. Pas 500€/mois. Un budget cohérent avec leur ambition.

Ton ambition définit ton budget. Tu veux doubler ? Investis en conséquence. Tu veux tripler ? Investis proportionnellement. C'est mathématique.

À ton niveau, chaque euro investi en acquisition a un effet de levier considérable. Tu as la structure pour absorber la croissance. Tu as les process. Ce qui te manque peut-être, c'est un moteur d'acquisition qui tourne à plein régime et une équipe dédiée pour l'opérer.""",
            "keyPoints": [
                "À ton niveau, l'acquisition est le principal levier de croissance",
                "Les conciergeries qui explosent investissent massivement et structurellement",
                "Ton ambition définit ton budget : viser haut implique d'investir en conséquence",
                "Déléguer l'acquisition permet de te concentrer sur ta zone de génie"
            ]
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
        
        # La recommandation est générée dynamiquement par generate_personalized_recommendation()

    return {
        "segment": segment,
        "diagSummary": diag_summary,
        "mainBlocker": main_blocker,
        "priority": priority,
        "structureAnalysis": structure_analysis,
        "acquisitionAnalysis": acquisition_analysis,
        "valueAnalysis": value_analysis,
        "investmentLesson": investment_lesson,
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
    
    # Generate prompt and get segment
    prompt, segment = generate_analysis_prompt(
        request.userInfo,
        request.answers,
        request.scores
    )
    
    # Call OpenAI GPT for personalized analysis
    try:
        logger.info(f"Calling OpenAI API for analysis...")
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Tu es un expert en structuration de conciergeries Airbnb. Tu fournis des analyses business directes et professionnelles en français."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Parse GPT response
        gpt_response = completion.choices[0].message.content.strip()
        logger.info(f"GPT Response received: {gpt_response[:200]}...")
        
        # Clean the response if it contains markdown code blocks
        if gpt_response.startswith("```"):
            gpt_response = gpt_response.split("```")[1]
            if gpt_response.startswith("json"):
                gpt_response = gpt_response[4:]
        gpt_response = gpt_response.strip()
        
        gpt_analysis = json.loads(gpt_response)
        
        # Get detailed analysis from deterministic function for structure
        detailed_analysis = await analyze_diagnostic(
            request.userInfo,
            request.answers,
            request.scores
        )
        
        # Merge GPT personalized text with detailed structure
        # IMPORTANT: mainBlocker et priority sont TOUJOURS calculés de façon déterministe
        # GPT ne génère que le diagSummary pour le style - pas les données critiques
        analysis = {
            'segment': segment,
            'diagSummary': gpt_analysis.get('diagSummary', detailed_analysis['diagSummary']),
            'mainBlocker': detailed_analysis['mainBlocker'],  # TOUJOURS déterministe
            'priority': detailed_analysis['priority'],  # TOUJOURS déterministe
            'goodtimeRecommendation': detailed_analysis['goodtimeRecommendation'],
            'structureAnalysis': detailed_analysis.get('structureAnalysis'),
            'acquisitionAnalysis': detailed_analysis.get('acquisitionAnalysis'),
            'valueAnalysis': detailed_analysis.get('valueAnalysis'),
            'investmentLesson': detailed_analysis.get('investmentLesson'),
            'roadmap': detailed_analysis.get('roadmap')
        }
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        # Fallback to deterministic analysis
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
        goodtimeRecommendation=analysis['goodtimeRecommendation'],
        structureAnalysis=analysis.get('structureAnalysis'),
        acquisitionAnalysis=analysis.get('acquisitionAnalysis'),
        valueAnalysis=analysis.get('valueAnalysis'),
        investmentLesson=analysis.get('investmentLesson'),
        roadmap=analysis.get('roadmap')
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
