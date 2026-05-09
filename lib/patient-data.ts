export type Condition = {
  name: string;
  icd10: string;
  diagnosed: string;
  status: "active" | "monitoring" | "resolved";
  severity: "mild" | "moderate" | "severe";
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  prescribing_doctor: string;
};

export type PriorVisit = {
  date: string;
  type: string;
  doctor: string;
  showed_up: boolean;
  notes: string;
};

export type PatientHealth = {
  patient_id: string;
  dob: string;
  age: number;
  gender: string;
  blood_type: string;
  phone: string;
  allergies: string[];
  conditions: Condition[];
  medications: Medication[];
  prior_visits: PriorVisit[];
  insurance_type: string;
  member_id: string;
  group_id: string;
  deductible: number;
  deductible_met: number;
  out_of_pocket_max: number;
  out_of_pocket_met: number;
};

export const PATIENT_HEALTH: Record<string, PatientHealth> = {
  P001: {
    patient_id: "P001",
    dob: "1987-04-12",
    age: 37,
    gender: "Female",
    blood_type: "B+",
    phone: "(555) 234-5678",
    allergies: ["Penicillin", "Latex"],
    conditions: [
      { name: "Type 2 Diabetes", icd10: "E11", diagnosed: "2019-03-15", status: "active", severity: "moderate" },
      { name: "Hypertension", icd10: "I10", diagnosed: "2020-07-22", status: "active", severity: "mild" },
    ],
    medications: [
      { name: "Metformin", dosage: "1000mg", frequency: "Twice daily", prescribing_doctor: "Dr. Reyes" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribing_doctor: "Dr. Reyes" },
    ],
    prior_visits: [
      { date: "2024-11-10", type: "Ultrasound", doctor: "Dr. Reyes", showed_up: false, notes: "No-showed. Rescheduled." },
      { date: "2024-08-22", type: "Ultrasound", doctor: "Dr. Reyes", showed_up: false, notes: "No-showed. Called to reschedule." },
      { date: "2024-05-15", type: "Annual Physical", doctor: "Dr. Reyes", showed_up: true, notes: "HbA1c 7.8%, BP 138/88. Adjusted Metformin dose." },
      { date: "2024-02-03", type: "Blood Work Follow-up", doctor: "Dr. Reyes", showed_up: true, notes: "Labs within normal range." },
    ],
    insurance_type: "PPO",
    member_id: "AET-2847563",
    group_id: "GRP-88120",
    deductible: 1500,
    deductible_met: 1200,
    out_of_pocket_max: 5000,
    out_of_pocket_met: 1800,
  },
  P002: {
    patient_id: "P002",
    dob: "1962-09-03",
    age: 61,
    gender: "Male",
    blood_type: "O+",
    phone: "(555) 345-6789",
    allergies: ["Sulfa drugs"],
    conditions: [
      { name: "Coronary Artery Disease", icd10: "I25.1", diagnosed: "2021-01-10", status: "active", severity: "severe" },
      { name: "Atrial Fibrillation", icd10: "I48.91", diagnosed: "2022-06-05", status: "monitoring", severity: "moderate" },
      { name: "Hyperlipidemia", icd10: "E78.5", diagnosed: "2018-11-20", status: "active", severity: "mild" },
    ],
    medications: [
      { name: "Warfarin", dosage: "5mg", frequency: "Once daily", prescribing_doctor: "Dr. Chen" },
      { name: "Atorvastatin", dosage: "40mg", frequency: "Once daily", prescribing_doctor: "Dr. Chen" },
      { name: "Metoprolol", dosage: "25mg", frequency: "Twice daily", prescribing_doctor: "Dr. Chen" },
    ],
    prior_visits: [
      { date: "2025-01-15", type: "Cardiology Follow-up", doctor: "Dr. Chen", showed_up: true, notes: "EKG normal sinus rhythm. INR 2.4 — therapeutic." },
      { date: "2024-10-05", type: "Heart Surgery Consultation", doctor: "Dr. Chen", showed_up: true, notes: "Scheduled bypass evaluation." },
      { date: "2024-07-19", type: "Echocardiogram", doctor: "Dr. Chen", showed_up: true, notes: "EF 45%, mild mitral regurgitation." },
    ],
    insurance_type: "Government",
    member_id: "MCR-1A2B3C4D",
    group_id: "MEDICARE-A",
    deductible: 1632,
    deductible_met: 1632,
    out_of_pocket_max: 7400,
    out_of_pocket_met: 3200,
  },
  P003: {
    patient_id: "P003",
    dob: "1991-07-28",
    age: 33,
    gender: "Female",
    blood_type: "A-",
    phone: "(555) 456-7890",
    allergies: ["Aspirin", "Codeine"],
    conditions: [
      { name: "Glioblastoma Grade III", icd10: "C71.9", diagnosed: "2024-09-01", status: "active", severity: "severe" },
      { name: "Seizure Disorder", icd10: "G40.909", diagnosed: "2024-09-15", status: "active", severity: "moderate" },
    ],
    medications: [
      { name: "Levetiracetam", dosage: "500mg", frequency: "Twice daily", prescribing_doctor: "Dr. Williams" },
      { name: "Dexamethasone", dosage: "4mg", frequency: "Three times daily", prescribing_doctor: "Dr. Williams" },
      { name: "Temozolomide", dosage: "200mg/m²", frequency: "Days 1-5 of 28-day cycle", prescribing_doctor: "Dr. Williams" },
    ],
    prior_visits: [
      { date: "2025-02-28", type: "Brain Surgery Consultation", doctor: "Dr. Williams", showed_up: false, notes: "No-showed. Family contacted — transportation issues." },
      { date: "2025-01-14", type: "MRI Scan", doctor: "Dr. Williams", showed_up: true, notes: "Tumor 3.2cm, slight growth. Surgical planning initiated." },
      { date: "2024-11-20", type: "Chemotherapy Session 3", doctor: "Dr. Williams", showed_up: true, notes: "Tolerated well. Nausea managed with Ondansetron." },
      { date: "2024-10-01", type: "Initial Diagnosis", doctor: "Dr. Williams", showed_up: true, notes: "Biopsy confirmed Grade III glioblastoma." },
    ],
    insurance_type: "HMO",
    member_id: "TRI-9876543",
    group_id: "TRICARE-STD",
    deductible: 3000,
    deductible_met: 2400,
    out_of_pocket_max: 8000,
    out_of_pocket_met: 5100,
  },
  P004: {
    patient_id: "P004",
    dob: "1995-12-04",
    age: 29,
    gender: "Male",
    blood_type: "AB+",
    phone: "(555) 567-8901",
    allergies: [],
    conditions: [
      { name: "Acute Appendicitis", icd10: "K37", diagnosed: "2025-05-08", status: "active", severity: "severe" },
    ],
    medications: [
      { name: "Cefazolin", dosage: "1g IV", frequency: "Pre-op prophylaxis", prescribing_doctor: "Dr. Reyes" },
    ],
    prior_visits: [
      { date: "2025-05-08", type: "ER Visit", doctor: "Dr. Reyes", showed_up: true, notes: "RLQ pain. CT confirmed appendicitis. Urgent surgery scheduled." },
      { date: "2023-06-15", type: "Annual Physical", doctor: "Dr. Adams", showed_up: true, notes: "Healthy. No significant findings." },
    ],
    insurance_type: "PPO",
    member_id: "CIG-5543218",
    group_id: "GRP-CIGNA-44",
    deductible: 1000,
    deductible_met: 350,
    out_of_pocket_max: 4000,
    out_of_pocket_met: 350,
  },
  P005: {
    patient_id: "P005",
    dob: "1978-03-16",
    age: 46,
    gender: "Female",
    blood_type: "O-",
    phone: "(555) 678-9012",
    allergies: ["Ibuprofen", "Shellfish (dietary)"],
    conditions: [
      { name: "Ovarian Cyst", icd10: "N83.2", diagnosed: "2025-02-10", status: "monitoring", severity: "moderate" },
      { name: "Polycystic Ovary Syndrome", icd10: "E28.2", diagnosed: "2015-08-30", status: "active", severity: "mild" },
      { name: "Iron-deficiency Anemia", icd10: "D50.9", diagnosed: "2023-04-12", status: "active", severity: "mild" },
    ],
    medications: [
      { name: "Ferrous Sulfate", dosage: "325mg", frequency: "Once daily", prescribing_doctor: "Dr. Chen" },
      { name: "Metformin", dosage: "500mg", frequency: "Once daily", prescribing_doctor: "Dr. Chen" },
    ],
    prior_visits: [
      { date: "2025-04-01", type: "Pelvic Ultrasound", doctor: "Dr. Chen", showed_up: false, notes: "No-showed. 3rd no-show in 6 months." },
      { date: "2025-02-10", type: "Pelvic Ultrasound", doctor: "Dr. Chen", showed_up: false, notes: "No-showed. Rescheduled." },
      { date: "2025-01-05", type: "Pelvic Ultrasound", doctor: "Dr. Chen", showed_up: false, notes: "No-showed. Called next day." },
      { date: "2024-10-20", type: "GYN Consultation", doctor: "Dr. Chen", showed_up: true, notes: "Cyst detected. Ultrasound ordered." },
    ],
    insurance_type: "N/A",
    member_id: "—",
    group_id: "—",
    deductible: 0,
    deductible_met: 0,
    out_of_pocket_max: 0,
    out_of_pocket_met: 0,
  },
};
