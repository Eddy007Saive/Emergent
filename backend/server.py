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
    """Generate analysis based on scores - deterministic approach for prototype"""
    
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
    
    # Generate personalized analysis based on scores
    first_name = user_info.firstName
    
    # Identify weakest area
    structure_pct = (structure_score / 20) * 100
    acquisition_pct = (acquisition_score / 18) * 100
    value_pct = (value_score / 6) * 100
    
    weakest = "structure"
    if acquisition_pct < structure_pct and acquisition_pct < value_pct:
        weakest = "acquisition"
    elif value_pct < structure_pct:
        weakest = "value"
    
    # Generate diagSummary based on segment
    if segment == "artisanal":
        diag_summary = f"{first_name}, ta conciergerie repose entièrement sur toi. Avec un score de {total_score}/44, tu es dans une situation de dépendance totale qui limite ta croissance et épuise ton énergie. Sans structuration, tu n'as pas une entreprise mais un job chronophage."
        main_blocker = "Dépendance opérationnelle totale"
        priority = "Documenter tes 3 process critiques et déléguer au moins une fonction clé dans les 90 prochains jours."
        recommendation = f"Goodtime peut t'aider à sortir de cette impasse. Nous commencerons par cartographier tes tâches quotidiennes pour identifier ce qui peut être délégué immédiatement. Ensuite, nous poserons les bases d'un moteur d'acquisition simple pour que tu arrêtes de dépendre du bouche-à-oreille. En 12 mois, tu peux transformer ta conciergerie en vraie entreprise."
    
    elif segment == "transition":
        if weakest == "acquisition":
            main_blocker = "Acquisition non prévisible"
            priority = "Mettre en place un canal d'acquisition systématique (SEO local + GMB) qui génère des leads chaque mois."
        elif weakest == "structure":
            main_blocker = "Process encore fragiles"
            priority = "Finaliser et faire appliquer les process pour les 5 situations critiques de ta conciergerie."
        else:
            main_blocker = "Valeur patrimoniale limitée"
            priority = "Structurer tes contrats propriétaires et réduire ta présence dans les relations clients."
        
        diag_summary = f"{first_name}, tu as posé des bases mais ta conciergerie reste fragile. Score de {total_score}/44 : tu es en transition. Les trous dans la raquette t'empêchent de scaler sereinement. Il est temps de consolider avant de vouloir grandir."
        recommendation = f"Goodtime t'accompagne pour franchir ce cap décisif. Nous allons renforcer ta structure là où elle vacille ({weakest}) et installer un moteur d'acquisition qui te rend prévisible. Notre méthode a aidé des dizaines de conciergeries à passer de 'je gère' à 'ça tourne'. Réserve un appel pour voir comment on peut t'aider concrètement."
    
    else:  # machine
        diag_summary = f"{first_name}, bravo. Avec {total_score}/44, tu fais partie des rares qui ont compris que la conciergerie est un business, pas un hobby. Ta structure est solide et ton potentiel de revente existe. Il reste des optimisations à faire, mais tu es sur la bonne voie."
        main_blocker = "Optimisation du scaling"
        priority = "Affiner tes KPIs d'acquisition et préparer ta capacité d'absorption pour le prochain palier de croissance."
        recommendation = f"Goodtime travaille avec les conciergeries matures comme la tienne pour maximiser la valeur. Nous pouvons affiner ton moteur d'acquisition, optimiser tes marges par logement, et préparer une éventuelle revente ou levée de fonds. Tu as construit quelque chose de solide - voyons ensemble comment le faire fructifier."
    
    return {
        "segment": segment,
        "diagSummary": diag_summary,
        "mainBlocker": main_blocker,
        "priority": priority,
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
