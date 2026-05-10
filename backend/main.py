"""
No-Show Predictor — Backend Engine
  POST /risk-score       → batch risk scoring with PPO model
  POST /update-outcome   → log actual outcome + run PPO update
  POST /overbooking      → overbooking recommendation for a day
  POST /interventions    → recommended interventions per patient
  GET  /model/stats      → PPO performance metrics
  GET  /model/features   → feature importance ranking
  GET  /health           → liveness check
"""

import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import features as F
import overbooking as OB
import interventions as IV
from model import PPORiskModel
from synthetic_data import generate

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("backend")

# ── Global model instance ─────────────────────────────────────────────────────

MODEL = PPORiskModel()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL.is_fitted:
        log.info("Generating synthetic training data and fitting base model…")
        X, y = generate(n=1200)
        MODEL.fit(X, y)
        ns_rate = round(y.mean() * 100, 1)
        log.info(f"Base model fitted. Synthetic no-show rate: {ns_rate}%")
    else:
        log.info("Model state restored from disk.")
    yield


app = FastAPI(title="No-Show Predictor Engine", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ──────────────────────────────────────────────────────────


class Appointment(BaseModel):
    patient_id: str
    patient_name: str
    appointment_time: str
    appointment_type: str = "consultation"
    doctor_name: str = ""
    insurance_provider: str | None = None
    prior_no_shows: int | None = None
    confirmed: bool | None = None
    referral_source: str | None = None


class PatientInfo(BaseModel):
    patient_id: str
    age: int = 40
    gender: str = "unknown"
    race: str = "other"
    distance_miles: float = 5.0
    prior_no_shows: int = 0
    prior_shows: int = 1
    lead_time_days: int = 7
    insurance_type: str = "N/A"
    confirmed: bool = False
    conditions: list[dict] = []
    caregiver: dict | None = None


class RiskScoreRequest(BaseModel):
    appointments: list[Appointment]
    patients: list[PatientInfo] | None = None


class OutcomeUpdate(BaseModel):
    patient_id: str
    showed_up: bool
    appointment: dict
    patient: dict | None = None


class OverbookRequest(BaseModel):
    scores: list[dict]
    date: str | None = None


class InterventionRequest(BaseModel):
    patient: dict
    appointment: dict
    risk_score: float


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok", "model_fitted": MODEL.is_fitted, "ppo_updates": MODEL.total_updates}


@app.post("/risk-score")
def risk_score(req: RiskScoreRequest):
    patient_lookup: dict[str, dict] = {}
    if req.patients:
        for p in req.patients:
            patient_lookup[p.patient_id] = p.model_dump()

    scores = []
    for appt in req.appointments:
        appt_dict = appt.model_dump()

        # Build patient dict — merge from explicit patients list or derive from appt
        pat = patient_lookup.get(appt.patient_id, {})
        if not pat:
            pat = {
                "patient_id": appt.patient_id,
                "age": 40,
                "gender": "unknown",
                "race": "other",
                "distance_miles": 5.0,
                "prior_no_shows": appt.prior_no_shows or 0,
                "prior_shows": 1,
                "lead_time_days": 7,
                "insurance_type": appt.insurance_provider or "N/A",
                "confirmed": appt.confirmed or False,
                "conditions": [],
            }

        # Override prior_no_shows from appointment if available
        if appt.prior_no_shows is not None:
            pat["prior_no_shows"] = appt.prior_no_shows
        if appt.confirmed is not None:
            pat["confirmed"] = appt.confirmed

        x = F.extract(appt_dict, pat)
        prob = MODEL.predict_proba(x)

        if prob >= 0.65:
            level = "high"
        elif prob >= 0.40:
            level = "medium"
        else:
            level = "low"

        # Generate plain-language reasons
        reasons = _build_reasons(appt_dict, pat, prob)

        # Get interventions
        inv_result = IV.recommend(pat, appt_dict, prob)

        scores.append({
            "patient_id": appt.patient_id,
            "patient_name": appt.patient_name,
            "appointment_time": appt.appointment_time,
            "risk_score": round(prob, 3),
            "risk_level": level,
            "reasons": reasons,
            "confidence": round(min(0.95, abs(prob - 0.5) * 2 + 0.60), 2),
            "interventions": inv_result["interventions"],
            "estimated_reduction_pct": inv_result["estimated_reduction_pct"],
        })

    return {"scores": scores}


@app.post("/update-outcome")
def update_outcome(req: OutcomeUpdate):
    appt = req.appointment
    pat = req.patient or {}
    if "prior_no_shows" not in pat:
        pat["prior_no_shows"] = appt.get("prior_no_shows", 0)

    x = F.extract(appt, pat)
    old_prob = MODEL.predict_proba(x)
    result = MODEL.record_outcome(x, old_prob, actual_no_show=not req.showed_up)

    log.info(
        f"Outcome logged — patient={req.patient_id} showed={req.showed_up} "
        f"pred={round(old_prob, 2)} ppo_alpha={result.get('alpha')} beta={result.get('beta')}"
    )
    return {"success": True, "ppo_update": result}


@app.post("/overbooking")
def overbooking(req: OverbookRequest):
    return OB.recommend(req.scores, req.date)


@app.post("/interventions")
def interventions(req: InterventionRequest):
    return IV.recommend(req.patient, req.appointment, req.risk_score)


@app.get("/model/stats")
def model_stats():
    return MODEL.metrics()


@app.get("/model/features")
def model_features():
    return {"importance": MODEL.feature_importance()}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_reasons(appt: dict, pat: dict, prob: float) -> list[str]:
    reasons = []
    ns = int(pat.get("prior_no_shows", 0))
    dist = float(pat.get("distance_miles", 5.0))
    confirmed = bool(pat.get("confirmed", appt.get("confirmed", False)))
    lead = int(pat.get("lead_time_days", 7))
    has_ins = str(pat.get("insurance_type", "N/A")).upper() not in ("N/A", "NONE", "")
    conditions = pat.get("conditions", [])
    age = int(pat.get("age", 40))

    if ns >= 2:
        reasons.append(f"{ns} prior no-shows on record")
    elif ns == 1:
        reasons.append("1 prior no-show on record")

    if not confirmed:
        reasons.append("Appointment not yet confirmed")

    if lead > 30:
        reasons.append(f"Booked {lead} days in advance (far out)")

    if dist > 8:
        reasons.append(f"Lives {dist:.0f} mi from clinic (transport risk)")

    if not has_ins:
        reasons.append("No insurance on file")

    sev_map = {"mild": 1, "moderate": 2, "severe": 3}
    max_sev = max([sev_map.get(c.get("severity", "mild"), 0) for c in conditions], default=0)
    if max_sev == 3:
        reasons.append("Severe active condition — high anxiety risk")

    if age < 30:
        reasons.append("Young adult (18-30): historically higher no-show rate")

    if prob < 0.30 and not reasons:
        reasons.append("Confirmed and consistent attendance history")
        if has_ins:
            reasons.append("Insurance verified")

    return reasons[:4]   # cap at 4 for UI
