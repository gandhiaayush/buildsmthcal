"""
Feature engineering for no-show risk prediction.

Feature vector (27 dims):
 0     age_norm              - age / 100
 1     is_female             - gender binary
 2-6   race_[white/black/hispanic/asian/other] - SDOH proxy (access barriers)
 7     distance_norm         - miles / 50
 8     prior_no_shows_norm   - count / 5
 9     historical_show_rate  - shows / total visits
 10    lead_time_norm        - booking lead days / 90
 11    hour_norm             - appointment hour / 24
 12    dow_norm              - day of week / 7
 13    is_monday_friday      - high no-show days
 14    has_insurance         - binary
 15    is_confirmed          - binary
 16    max_severity          - 0 / 0.33 / 0.67 / 1.0
 17    num_conditions_norm   - count / 5
 18    has_caregiver         - binary
 18-26 procedure_[0-8]       - one-hot (top 9 types)
"""

from datetime import datetime
from typing import Any
import numpy as np

PROCEDURE_TYPES = [
    "ultrasound", "blood_work", "consultation", "physical_exam",
    "mri_scan", "ct_scan", "echocardiogram", "appendix_removal",
    "heart_surgery",
]

RACE_LABELS = ["white", "black", "hispanic", "asian", "other"]

SEVERITY_MAP = {"mild": 0.33, "moderate": 0.67, "severe": 1.0}


def extract(appt: dict[str, Any], patient: dict[str, Any]) -> np.ndarray:
    """Return a 27-element float32 feature vector."""
    # Parse appointment time
    raw = appt.get("appointment_time", "")
    try:
        appt_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        appt_dt = datetime.now()

    # ── Demographics ──────────────────────────────────────────────────────────
    age = float(patient.get("age", 40))
    age_norm = min(age, 100) / 100.0
    is_female = 1.0 if str(patient.get("gender", "male")).lower() == "female" else 0.0

    # Race / ethnicity — used only as SDOH access-barrier proxy
    race = str(patient.get("race", "white")).lower()
    race_vec = [1.0 if race == r else 0.0 for r in RACE_LABELS]

    # ── Geography ─────────────────────────────────────────────────────────────
    distance = float(patient.get("distance_miles", 5.0))
    distance_norm = min(distance, 50.0) / 50.0

    # ── Visit history ─────────────────────────────────────────────────────────
    prior_ns = float(patient.get("prior_no_shows", 0))
    prior_s = float(patient.get("prior_shows", 1))
    total_visits = prior_ns + prior_s
    prior_ns_norm = min(prior_ns, 5.0) / 5.0
    show_rate = prior_s / max(total_visits, 1.0)

    # ── Appointment timing ────────────────────────────────────────────────────
    lead_days = float(patient.get("lead_time_days", 7.0))
    lead_norm = min(lead_days, 90.0) / 90.0
    hour_norm = float(appt_dt.hour) / 24.0
    dow = float(appt_dt.weekday())  # 0=Mon
    dow_norm = dow / 7.0
    is_mon_fri = 1.0 if dow in [0.0, 4.0] else 0.0  # highest no-show days

    # ── Insurance & confirmation ──────────────────────────────────────────────
    ins = str(patient.get("insurance_type", "None"))
    has_insurance = 0.0 if ins.upper() in ("N/A", "NONE", "") else 1.0
    is_confirmed = 1.0 if appt.get("confirmed", False) else 0.0

    # ── Medical complexity ────────────────────────────────────────────────────
    conditions = patient.get("conditions", [])
    severities = [SEVERITY_MAP.get(c.get("severity", "mild"), 0.33) for c in conditions]
    max_severity = max(severities) if severities else 0.0
    num_cond_norm = min(len(conditions), 5) / 5.0
    has_caregiver = 1.0 if patient.get("caregiver") else 0.0

    # ── Procedure type (one-hot) ──────────────────────────────────────────────
    proc = str(appt.get("appointment_type", "consultation")).lower()
    proc_vec = [1.0 if proc == p else 0.0 for p in PROCEDURE_TYPES]

    vec = (
        [age_norm, is_female]
        + race_vec
        + [distance_norm, prior_ns_norm, show_rate, lead_norm,
           hour_norm, dow_norm, is_mon_fri,
           has_insurance, is_confirmed,
           max_severity, num_cond_norm, has_caregiver]
        + proc_vec
    )
    return np.array(vec, dtype=np.float32)


N_FEATURES = 27  # keep in sync with above
