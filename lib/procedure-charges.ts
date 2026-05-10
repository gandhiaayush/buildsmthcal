export type ChargeLineItem = {
  code: string;
  description: string;
  category: "professional" | "facility" | "ancillary" | "medication";
  base_charge: number;
};

export type ProcedureChargeSchedule = {
  label: string;
  line_items: ChargeLineItem[];
};

export const CHARGE_SCHEDULE: Record<string, ProcedureChargeSchedule> = {
  consultation: {
    label: "Consultation",
    line_items: [
      { code: "99213", description: "Office visit, established patient (30 min)", category: "professional", base_charge: 250 },
      { code: "99000", description: "Handling/conveying specimen", category: "ancillary", base_charge: 15 },
    ],
  },
  ultrasound: {
    label: "Ultrasound",
    line_items: [
      { code: "76700", description: "Abdominal ultrasound, complete", category: "professional", base_charge: 580 },
      { code: "76900", description: "Radiologist interpretation", category: "professional", base_charge: 220 },
      { code: "A9999", description: "Facility fee", category: "facility", base_charge: 75 },
    ],
  },
  blood_work: {
    label: "Blood Work",
    line_items: [
      { code: "80053", description: "Comprehensive metabolic panel", category: "ancillary", base_charge: 95 },
      { code: "85025", description: "CBC with differential", category: "ancillary", base_charge: 45 },
      { code: "85610", description: "Prothrombin time (PT)", category: "ancillary", base_charge: 35 },
      { code: "36415", description: "Routine venipuncture", category: "professional", base_charge: 25 },
    ],
  },
  mri_scan: {
    label: "MRI Scan",
    line_items: [
      { code: "70553", description: "MRI brain with/without contrast", category: "professional", base_charge: 2200 },
      { code: "26900", description: "Radiologist interpretation", category: "professional", base_charge: 450 },
      { code: "A9999", description: "Facility fee", category: "facility", base_charge: 250 },
      { code: "A9579", description: "Contrast material (gadolinium)", category: "medication", base_charge: 380 },
    ],
  },
  ct_scan: {
    label: "CT Scan",
    line_items: [
      { code: "74177", description: "CT abdomen/pelvis with contrast", category: "professional", base_charge: 1350 },
      { code: "26700", description: "Radiologist interpretation", category: "professional", base_charge: 350 },
      { code: "A9999", description: "Facility fee", category: "facility", base_charge: 200 },
      { code: "A9575", description: "IV contrast material", category: "medication", base_charge: 180 },
    ],
  },
  echocardiogram: {
    label: "Echocardiogram",
    line_items: [
      { code: "93306", description: "Echocardiogram with Doppler", category: "professional", base_charge: 950 },
      { code: "93010", description: "Electrocardiogram (EKG)", category: "professional", base_charge: 120 },
      { code: "93000", description: "Cardiologist interpretation", category: "professional", base_charge: 280 },
      { code: "A9999", description: "Facility fee", category: "facility", base_charge: 150 },
    ],
  },
  physical_exam: {
    label: "Physical Exam",
    line_items: [
      { code: "99385", description: "Preventive visit, age 18-39 (new patient)", category: "professional", base_charge: 220 },
      { code: "85025", description: "CBC with differential", category: "ancillary", base_charge: 45 },
      { code: "80053", description: "Comprehensive metabolic panel", category: "ancillary", base_charge: 95 },
      { code: "81001", description: "Urinalysis with microscopy", category: "ancillary", base_charge: 25 },
    ],
  },
  appendix_removal: {
    label: "Appendix Removal",
    line_items: [
      { code: "44950", description: "Appendectomy, open or laparoscopic", category: "professional", base_charge: 12500 },
      { code: "00840", description: "Anesthesia — intraabdominal procedure", category: "professional", base_charge: 4200 },
      { code: "A9999", description: "Operating room facility fee", category: "facility", base_charge: 8000 },
      { code: "99232", description: "Subsequent hospital care (2 days)", category: "professional", base_charge: 1800 },
      { code: "99409", description: "Recovery room", category: "facility", base_charge: 1200 },
      { code: "J0690", description: "Cefazolin — prophylactic antibiotic", category: "medication", base_charge: 85 },
    ],
  },
  heart_surgery: {
    label: "Heart Surgery (CABG)",
    line_items: [
      { code: "33533", description: "Coronary artery bypass graft, single arterial", category: "professional", base_charge: 45000 },
      { code: "00560", description: "Anesthesia — heart surgery with pump oxygenator", category: "professional", base_charge: 18000 },
      { code: "A9999", description: "OR / ICU facility fee", category: "facility", base_charge: 28000 },
      { code: "33210", description: "Temporary transvenous pacemaker insertion", category: "professional", base_charge: 3500 },
      { code: "99291", description: "Critical care, first 30-74 minutes", category: "professional", base_charge: 2800 },
      { code: "36010", description: "Central venous catheter placement", category: "professional", base_charge: 1200 },
    ],
  },
  brain_surgery: {
    label: "Brain Surgery (Craniotomy)",
    line_items: [
      { code: "61510", description: "Craniotomy for excision of brain tumor", category: "professional", base_charge: 52000 },
      { code: "00211", description: "Anesthesia — intracranial procedure", category: "professional", base_charge: 20000 },
      { code: "A9999", description: "Neuro-OR / Neuro-ICU facility fee", category: "facility", base_charge: 30000 },
      { code: "95920", description: "Intraoperative neurophysiology monitoring", category: "professional", base_charge: 8500 },
      { code: "20660", description: "Stereotactic head frame application", category: "professional", base_charge: 2200 },
      { code: "70553", description: "Intraoperative MRI", category: "ancillary", base_charge: 4500 },
    ],
  },
};

export function getChargeSchedule(procedure: string): ProcedureChargeSchedule {
  return CHARGE_SCHEDULE[procedure] ?? CHARGE_SCHEDULE["consultation"];
}

export function totalBaseCharge(items: ChargeLineItem[]): number {
  return items.reduce((sum, item) => sum + item.base_charge, 0);
}
