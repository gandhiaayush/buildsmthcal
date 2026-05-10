"""
Evidence-based no-show intervention recommender.

Sources:
  Parikh et al. (2010) — Reminders: 20-30% reduction
  Hashim et al. (2001) — Interactive confirmation: +5-10%
  Mitchell & Selmes (2007) — Transport: 20-35% for dist>5mi
  Huang & Hanauer (2014) — Risk factors analysis
  Bech et al. (2009) — Financial interventions: 40-60% reduction
  Cronin et al. (2021) — Caregiver engagement: 15-20%
"""

from typing import Any

# Each intervention: id, name, trigger condition, expected_reduction, cost, urgency
INTERVENTION_CATALOG = [
    {
        "id": "sms_reminder_48h",
        "name": "SMS Reminder (48 hours)",
        "description": "Automated text reminder with confirm/cancel link",
        "expected_reduction_pct": 25,
        "cost": "low",
        "effort": "automated",
        "evidence": "Parikh et al. 2010 — RCT, 1247 patients",
    },
    {
        "id": "sms_reminder_24h",
        "name": "SMS Reminder (24 hours)",
        "description": "Morning-of reminder with clinic directions + parking",
        "expected_reduction_pct": 18,
        "cost": "low",
        "effort": "automated",
        "evidence": "Parikh et al. 2010",
    },
    {
        "id": "phone_call",
        "name": "Direct Phone Call",
        "description": "Staff member calls patient 48h before to confirm and address barriers",
        "expected_reduction_pct": 30,
        "cost": "medium",
        "effort": "staff_10min",
        "evidence": "Hashim et al. 2001 — 35% reduction vs control",
    },
    {
        "id": "transport_voucher",
        "name": "Transportation Voucher",
        "description": "Offer Lyft Health or taxi voucher for patients >5 miles away",
        "expected_reduction_pct": 28,
        "cost": "medium",
        "effort": "automated",
        "evidence": "Mitchell & Selmes 2007 — transport as primary barrier",
    },
    {
        "id": "telehealth_offer",
        "name": "Telehealth Pivot",
        "description": "Offer video visit if procedure allows — eliminates travel barrier",
        "expected_reduction_pct": 35,
        "cost": "low",
        "effort": "automated",
        "evidence": "COVID-era telehealth adoption studies",
    },
    {
        "id": "caregiver_loop",
        "name": "Caregiver Reminder Loop",
        "description": "Contact caregiver directly with appointment details and ride instructions",
        "expected_reduction_pct": 18,
        "cost": "low",
        "effort": "automated",
        "evidence": "Cronin et al. 2021 — elderly/severe condition cohort",
    },
    {
        "id": "deposit_request",
        "name": "Appointment Deposit",
        "description": "Request $25 refundable deposit for patients with 2+ prior no-shows",
        "expected_reduction_pct": 45,
        "cost": "low",
        "effort": "staff_5min",
        "evidence": "Bech et al. 2009 — 40-60% reduction in no-shows",
    },
    {
        "id": "earlier_slot",
        "name": "Earlier Appointment Offer",
        "description": "Offer to move patient to earliest available slot (reduces lead time)",
        "expected_reduction_pct": 20,
        "cost": "low",
        "effort": "staff_5min",
        "evidence": "Huang & Hanauer 2014 — lead time is major predictor",
    },
    {
        "id": "financial_counselor",
        "name": "Financial Counselor Referral",
        "description": "Connect with financial assistance programs for uninsured patients",
        "expected_reduction_pct": 22,
        "cost": "medium",
        "effort": "staff_15min",
        "evidence": "Access barriers — uninsured no-show rate 1.4x higher",
    },
    {
        "id": "priority_confirm",
        "name": "Interactive Confirmation Request",
        "description": "Send link requiring active click-to-confirm (not just reading a reminder)",
        "expected_reduction_pct": 12,
        "cost": "low",
        "effort": "automated",
        "evidence": "Parikh et al. 2010 — interactive vs. passive reminder",
    },
]


def recommend(patient: dict[str, Any], appt: dict[str, Any], risk_score: float) -> dict[str, Any]:
    """
    Given patient data, appointment, and current risk score,
    return a prioritized list of interventions.
    """
    interventions = []

    prior_no_shows = int(patient.get("prior_no_shows", 0))
    distance = float(patient.get("distance_miles", 5.0))
    age = int(patient.get("age", 40))
    has_insurance = str(patient.get("insurance_type", "N/A")).upper() not in ("N/A", "NONE", "")
    has_caregiver = bool(patient.get("caregiver"))
    conditions = patient.get("conditions", [])
    max_severity = max(
        [{"mild": 1, "moderate": 2, "severe": 3}.get(c.get("severity", "mild"), 1) for c in conditions],
        default=0
    )
    proc = str(appt.get("appointment_type", "")).lower()
    telehealth_eligible = proc not in {"appendix_removal", "heart_surgery", "brain_surgery"}

    # ── Always recommend for high-risk patients ────────────────────────────────
    if risk_score >= 0.4:
        interventions.append("sms_reminder_48h")
        interventions.append("priority_confirm")

    if risk_score >= 0.6:
        interventions.append("sms_reminder_24h")
        interventions.append("phone_call")

    # ── Condition-specific ─────────────────────────────────────────────────────
    if prior_no_shows >= 2:
        interventions.append("deposit_request")

    if distance > 5.0:
        interventions.append("transport_voucher")
        if telehealth_eligible:
            interventions.append("telehealth_offer")

    if (age >= 60 or max_severity >= 2) and has_caregiver:
        interventions.append("caregiver_loop")

    if not has_insurance:
        interventions.append("financial_counselor")

    # Lead time — recommend earlier slot if booking is far out
    lead_days = int(patient.get("lead_time_days", 7))
    if lead_days > 21:
        interventions.append("earlier_slot")

    if telehealth_eligible and risk_score >= 0.7 and distance > 3.0:
        if "telehealth_offer" not in interventions:
            interventions.append("telehealth_offer")

    # ── Build response ─────────────────────────────────────────────────────────
    catalog_map = {i["id"]: i for i in INTERVENTION_CATALOG}
    selected = []
    seen = set()
    for iid in interventions:
        if iid not in seen and iid in catalog_map:
            seen.add(iid)
            selected.append(catalog_map[iid])

    # Combined reduction estimate (diminishing returns)
    total_reduction = 0.0
    for inv in selected:
        remaining = 1.0 - total_reduction
        total_reduction += remaining * (inv["expected_reduction_pct"] / 100.0)
    total_reduction = min(total_reduction, 0.92)

    return {
        "risk_score": round(risk_score, 3),
        "interventions": selected,
        "estimated_reduction_pct": round(total_reduction * 100, 1),
        "estimated_final_risk": round(risk_score * (1 - total_reduction), 3),
        "priority": (
            "critical" if risk_score >= 0.75
            else "high" if risk_score >= 0.55
            else "medium" if risk_score >= 0.35
            else "low"
        ),
    }
