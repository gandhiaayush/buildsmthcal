import { NextRequest, NextResponse } from "next/server";
import type { AppointmentRow, RiskScore } from "@/types";
import { mockRiskScores } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";

// Stable per-patient distance estimate derived from member_id (no real geocoding needed for demo)
function estimateDistance(patientId: string): number {
  const h = PATIENT_HEALTH[patientId];
  if (!h) return 5.0;
  // Deterministic: spread patients 2–18 miles from clinic
  const seed = h.member_id.charCodeAt(4) ?? 7;
  return Math.round(((seed % 16) + 2) * 10) / 10;
}

function buildPatientPayload(appt: AppointmentRow) {
  const h = PATIENT_HEALTH[appt.patient_id];
  if (!h) {
    return {
      patient_id: appt.patient_id,
      age: 40,
      gender: "unknown",
      race: "other",
      distance_miles: 5.0,
      prior_no_shows: appt.prior_no_shows ?? 0,
      prior_shows: 1,
      lead_time_days: 14,
      insurance_type: appt.insurance_provider ?? "N/A",
      confirmed: appt.confirmed ?? false,
      conditions: [],
      caregiver: null,
    };
  }

  const priorShows = h.prior_visits.filter((v) => v.showed_up).length;
  const priorNS = appt.prior_no_shows ?? h.prior_visits.filter((v) => !v.showed_up).length;

  // Estimated lead time: use appointment date - today (or 14 days if in past)
  const diff = (new Date(appt.appointment_time).getTime() - Date.now()) / 86_400_000;
  const leadDays = diff > 0 ? Math.round(diff) : 14;

  return {
    patient_id: h.patient_id,
    age: h.age,
    gender: h.gender,
    race: "other",  // not in current patient data — defaults to "other" (neutral SDOH score)
    distance_miles: estimateDistance(appt.patient_id),
    prior_no_shows: priorNS,
    prior_shows: priorShows,
    lead_time_days: leadDays,
    insurance_type: h.insurance_type,
    confirmed: appt.confirmed ?? false,
    conditions: h.conditions,
    caregiver: h.caregiver ?? null,
  };
}

export async function POST(req: NextRequest) {
  const { appointments }: { appointments: AppointmentRow[] } = await req.json();

  const backendUrl = process.env.BACKEND_ENGINE_URL ?? "http://localhost:8000";
  try {
    const patients = appointments.map(buildPatientPayload);
    const res = await fetch(`${backendUrl}/risk-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointments, patients }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // fall through to mock
  }

  const scores: RiskScore[] = mockRiskScores(appointments);
  return NextResponse.json({ scores });
}
