// Shared localStorage store for nurse ↔ patient app sync
// Both apps run in the same browser for demo purposes

export type PatientStatus = "pending" | "confirmed" | "telehealth" | "cancelled";

export type CheckInResponse = {
  submitted_at: string;
  symptoms: string;
  questions: string;
  transportation_arranged: boolean;
  fasting_compliant: boolean;
  emergency_contact_confirmed: boolean;
  caregiver_joining: boolean;
};

export type EditedCharge = {
  code: string;
  description: string;
  category: string;
  base_charge: number;
};

const KEY_STATUSES = "nsp_patient_statuses";
const KEY_CHECKINS = "nsp_checkin_responses";
const KEY_CHARGES = "nsp_edited_charges";
const KEY_CAREGIVER_SENT = "nsp_caregiver_sent";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  // Dispatch storage event so other tabs / components can react
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) }));
}

// Patient confirmation status
export function getStatuses(): Record<string, PatientStatus> {
  return read<Record<string, PatientStatus>>(KEY_STATUSES, {});
}

export function setStatus(patientId: string, status: PatientStatus) {
  const current = getStatuses();
  write(KEY_STATUSES, { ...current, [patientId]: status });
}

// Pre-visit check-in responses
export function getCheckins(): Record<string, CheckInResponse> {
  return read<Record<string, CheckInResponse>>(KEY_CHECKINS, {});
}

export function saveCheckin(patientId: string, response: CheckInResponse) {
  const current = getCheckins();
  write(KEY_CHECKINS, { ...current, [patientId]: response });
}

// Nurse-edited charges
export function getEditedCharges(): Record<string, EditedCharge[]> {
  return read<Record<string, EditedCharge[]>>(KEY_CHARGES, {});
}

export function saveEditedCharges(patientId: string, items: EditedCharge[]) {
  const current = getEditedCharges();
  write(KEY_CHARGES, { ...current, [patientId]: items });
}

// Caregiver reminder tracking
export function getCaregiverSent(): string[] {
  return read<string[]>(KEY_CAREGIVER_SENT, []);
}

export function markCaregiverSent(patientId: string) {
  const current = getCaregiverSent();
  if (!current.includes(patientId)) {
    write(KEY_CAREGIVER_SENT, [...current, patientId]);
  }
}
