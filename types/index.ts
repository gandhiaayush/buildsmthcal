export type ProcedureType =
  | "appendix_removal"
  | "heart_surgery"
  | "brain_surgery"
  | "ultrasound"
  | string;

export type AppointmentRow = {
  patient_id: string;
  patient_name: string;
  patient_email?: string;
  appointment_time: string;
  appointment_type: ProcedureType;
  doctor_name: string;
  referral_source?: string;
  insurance_provider?: string;
  prior_no_shows?: number;
  confirmed?: boolean;
  language_preference?: string;
  caregiver_contact?: string;
};

export type RiskScore = {
  patient_id: string;
  patient_name: string;
  appointment_time: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  reasons: string[];
  confidence: number;
};

export type InsuranceStatus = {
  patient_id: string;
  insurance_provider: string;
  verified: boolean;
  flag_reason?: string;
};

export type ReferralRecord = {
  patient_id: string;
  referring_doctor: string;
  referral_date: string;
  authorization_number?: string;
  status: "complete" | "missing" | "expired";
};

export type PrepInstruction = {
  procedure: ProcedureType;
  one_week_before: string[];
  two_days_before: string[];
};

export type VoiceTriggerRequest = {
  patient_id: string;
  phone_number: string;
  call_type: "reminder" | "reschedule" | "waitlist" | "amnesty";
  language?: string;
  risk_level: "low" | "medium" | "high";
};

export type OverbookingSlot = {
  appointment_id: string;
  overbook_recommended: boolean;
  backup_patient_id?: string;
};

export type ClinicSettings = {
  clinic_name: string;
  avg_visit_value: number;
  accepted_insurance: string[];
  email_sender: string;
};

export type PostVisitUpdate = {
  patient_id: string;
  showed_up: boolean;
  rescheduled: boolean;
  new_appointment_time?: string;
  notes?: string;
};
