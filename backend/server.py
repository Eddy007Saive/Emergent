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

# OpenAI client
openai_client = OpenAI(
    api_key=os.environ.get('OPENAI_API_KEY'),
    base_url="https://api.emergentmind.com/v1"
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
    """Call OpenAI to analyze the diagnostic"""
    
    prompt, segment = generate_analysis_prompt(user_info, answers, scores)
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Tu es un expert en conciergeries Airbnb. Tu réponds uniquement en JSON valide, sans formatage markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up potential markdown formatting
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        analysis = json.loads(content)
        analysis['segment'] = segment
        
        return analysis
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}, content: {content}")
        # Fallback response
        return {
            "segment": segment,
            "diagSummary": f"{user_info.firstName}, ta conciergerie présente des axes d'amélioration importants. Une structuration plus poussée permettrait de libérer du temps et d'augmenter la valeur de ton activité.",
            "mainBlocker": "Structuration insuffisante",
            "priority": "Définir et documenter les process clés de ton activité.",
            "goodtimeRecommendation": "Goodtime peut t'accompagner pour structurer ton activité et mettre en place un moteur d'acquisition local efficace. Nous t'aiderons à passer d'un modèle artisanal à une vraie entreprise avec des process clairs et une croissance prévisible."
        }
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


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
