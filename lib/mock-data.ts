import type { AppointmentRow, RiskScore, OverbookingSlot } from "@/types";

export function mockRiskScore(patient: AppointmentRow): RiskScore {
  const hasNoShows = (patient.prior_no_shows ?? 0) > 0;
  const unconfirmed = !patient.confirmed;
  const noInsurance = !patient.insurance_provider;

  let score = 0.2;
  let reasons: string[] = [];

  if (hasNoShows) {
    score += 0.45;
    reasons.push(`${patient.prior_no_shows} prior no-show(s)`);
  }
  if (unconfirmed) {
    score += 0.15;
    reasons.push("Appointment unconfirmed");
  }
  if (noInsurance) {
    score += 0.1;
    reasons.push("No insurance on file");
  }

  score = Math.min(score, 0.97);

  if (reasons.length === 0) {
    reasons = ["First appointment", "Insurance verified", "Confirmed 48hrs out"];
  }

  const risk_level: RiskScore["risk_level"] =
    score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";

  return {
    patient_id: patient.patient_id,
    patient_name: patient.patient_name,
    appointment_time: patient.appointment_time,
    risk_score: parseFloat(score.toFixed(2)),
    risk_level,
    reasons,
    confidence: 0.84,
  };
}

export function mockRiskScores(patients: AppointmentRow[]): RiskScore[] {
  return patients.map(mockRiskScore);
}

export const MOCK_APPOINTMENTS: AppointmentRow[] = [
  {
    patient_id: "P001",
    patient_name: "Maria Santos",
    patient_email: "maria.santos@demo.com",
    appointment_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    appointment_type: "ultrasound",
    doctor_name: "Dr. Reyes",
    insurance_provider: "Aetna",
    prior_no_shows: 2,
    confirmed: false,
    referral_source: "Dr. Lee",
    language_preference: "en",
  },
  {
    patient_id: "P002",
    patient_name: "James Okonkwo",
    appointment_time: new Date(Date.now() + 3 * 3600000).toISOString(),
    appointment_type: "heart_surgery",
    doctor_name: "Dr. Chen",
    insurance_provider: "Medicare",
    prior_no_shows: 0,
    confirmed: true,
    referral_source: "Dr. Patel",
    authorization_number: "AUTH-9821",
    language_preference: "en",
  } as AppointmentRow & { authorization_number: string },
  {
    patient_id: "P003",
    patient_name: "Sofia Morales",
    appointment_time: new Date(Date.now() + 4 * 3600000).toISOString(),
    appointment_type: "brain_surgery",
    doctor_name: "Dr. Williams",
    insurance_provider: "Tricare",
    prior_no_shows: 1,
    confirmed: false,
    language_preference: "es",
  },
  {
    patient_id: "P004",
    patient_name: "David Kim",
    appointment_time: new Date(Date.now() + 5 * 3600000).toISOString(),
    appointment_type: "appendix_removal",
    doctor_name: "Dr. Reyes",
    insurance_provider: "Cigna",
    prior_no_shows: 0,
    confirmed: true,
    referral_source: "Dr. Adams",
  },
  {
    patient_id: "P005",
    patient_name: "Priya Patel",
    patient_email: "priya.patel@demo.com",
    appointment_time: new Date(Date.now() + 6 * 3600000).toISOString(),
    appointment_type: "ultrasound",
    doctor_name: "Dr. Chen",
    prior_no_shows: 3,
    confirmed: false,
  },
];

export const MOCK_OVERBOOKING_SLOTS: OverbookingSlot[] = [
  { appointment_id: "P003", overbook_recommended: true, backup_patient_id: "P005" },
  { appointment_id: "P001", overbook_recommended: true, backup_patient_id: "P004" },
];

export const MOCK_REVENUE_DATA = [
  { month: "Jan", before: 42000, after: 52000, noShowRate: 0.22 },
  { month: "Feb", before: 38000, after: 51000, noShowRate: 0.18 },
  { month: "Mar", before: 45000, after: 58000, noShowRate: 0.15 },
  { month: "Apr", before: 40000, after: 62000, noShowRate: 0.12 },
  { month: "May", before: 43000, after: 67000, noShowRate: 0.09 },
  { month: "Jun", before: 41000, after: 71000, noShowRate: 0.07 },
];
