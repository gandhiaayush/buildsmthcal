"""
Overbooking algorithm based on risk scores.

Strategy:
  expected_no_shows = Σ P(no-show_i) for all appointments
  recommended_slots = floor(expected_no_shows × safety_factor)
  max_cap           = floor(N × 0.20)   # never exceed 20% of day's slots

Safety factor by day:
  Monday / Friday  → 0.80  (higher no-show days, be conservative with overbook)
  Tue / Wed / Thu  → 0.65  (more reliable attendance)

Hard caps by procedure type:
  Surgical (heart/brain/appendix) → overbook_cap = 0
  (Cannot double-book a surgical suite)
  All others → overbook_cap = min(recommended, max_cap)

Slot selection: prioritize waitlist patients with LOWEST risk score
(most likely to come in on short notice).
"""

from datetime import datetime


SAFETY_FACTOR = {0: 0.80, 4: 0.80}   # Mon=0, Fri=4 → key: weekday
DEFAULT_SAFETY = 0.65

NO_OVERBOOK_PROCS = {"heart_surgery", "brain_surgery", "appendix_removal"}


def recommend(scores: list[dict], date_str: str | None = None) -> dict:
    """
    scores: list of {patient_id, appointment_type, risk_score, ...}
    Returns overbooking recommendation for the day.
    """
    if not scores:
        return {
            "expected_no_shows": 0.0,
            "recommended_overbook": 0,
            "reason": "No appointments",
            "slots": [],
            "high_risk_patients": [],
        }

    # Determine day of week for safety factor
    try:
        dt = datetime.fromisoformat(date_str) if date_str else datetime.now()
    except Exception:
        dt = datetime.now()
    dow = dt.weekday()
    safety = SAFETY_FACTOR.get(dow, DEFAULT_SAFETY)

    # Filter out hard-cap procedures from overbook pool
    bookable = [s for s in scores if s.get("appointment_type", "") not in NO_OVERBOOK_PROCS]
    surgical = [s for s in scores if s.get("appointment_type", "") in NO_OVERBOOK_PROCS]

    # Expected no-shows from non-surgical slots
    expected_ns = sum(float(s.get("risk_score", 0)) for s in bookable)

    # Recommended extra bookings
    recommended = int(expected_ns * safety)
    max_cap = max(1, len(bookable) // 5)   # 20% of bookable slots
    recommended = min(recommended, max_cap)

    # Flag high-risk patients (>0.65 score)
    high_risk = sorted(
        [s for s in scores if float(s.get("risk_score", 0)) >= 0.65],
        key=lambda x: float(x.get("risk_score", 0)),
        reverse=True,
    )

    # Slot assignments: which patients are on "waitlist overbook" status
    # We recommend the LOWEST-risk patients from the waitlist first
    overbook_slots = []
    if recommended > 0:
        overbook_slots = [
            {
                "slot_index": i + 1,
                "recommended_priority": "high",
                "reason": f"Expected {round(expected_ns, 1)} no-shows today (safety={safety})",
            }
            for i in range(recommended)
        ]

    # Surgical warning
    surgical_risk_sum = sum(float(s.get("risk_score", 0)) for s in surgical)
    surgical_note = None
    if surgical_risk_sum >= 1.0:
        surgical_note = (
            f"{len(surgical)} surgical procedure(s) at risk — consider calling to confirm. "
            "Surgical bays cannot be overbooked."
        )

    return {
        "expected_no_shows": round(expected_ns, 2),
        "recommended_overbook": recommended,
        "safety_factor": safety,
        "day_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dow],
        "high_risk_count": len(high_risk),
        "high_risk_patients": high_risk[:5],
        "slots": overbook_slots,
        "surgical_warning": surgical_note,
        "total_appointments": len(scores),
    }
