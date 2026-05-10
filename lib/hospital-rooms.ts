export type EquipmentItem = {
  id: string;
  name: string;
  status: "available" | "in-use" | "maintenance";
  last_used?: string;
};

export type HospitalRoom = {
  id: string;
  number: string;
  name: string;
  color: string;        // Tailwind bg class
  borderColor: string;
  procedures: string[]; // which appointment_types go here
  equipment: EquipmentItem[];
  capacity: number;     // max simultaneous appointments
};

export const HOSPITAL_ROOMS: HospitalRoom[] = [
  {
    id: "room-101",
    number: "101",
    name: "Ultrasound Suite",
    color: "bg-sky-50",
    borderColor: "border-sky-300",
    procedures: ["ultrasound", "blood_work", "physical_exam", "consultation"],
    capacity: 4,
    equipment: [
      { id: "us-01", name: "GE Logiq E10 Ultrasound", status: "available" },
      { id: "us-02", name: "Exam Table", status: "available" },
      { id: "us-03", name: "Ultrasound Cart", status: "available" },
      { id: "us-04", name: "Doppler Probe (3.5 MHz)", status: "available" },
      { id: "us-05", name: "Gel Warmer", status: "available" },
    ],
  },
  {
    id: "room-102",
    number: "102",
    name: "Surgical Bay",
    color: "bg-rose-50",
    borderColor: "border-rose-300",
    procedures: ["appendix_removal", "heart_surgery", "brain_surgery"],
    capacity: 1,
    equipment: [
      { id: "sb-01", name: "Surgical Table (Stryker 1080)", status: "available" },
      { id: "sb-02", name: "Electrocautery Unit (Bovie)", status: "available" },
      { id: "sb-03", name: "Anesthesia Machine (GE Aisys)", status: "available" },
      { id: "sb-04", name: "OR Overhead Lights", status: "available" },
      { id: "sb-05", name: "Surgical Camera (4K)", status: "available" },
      { id: "sb-06", name: "Neuronavigation System", status: "maintenance" },
    ],
  },
  {
    id: "room-103",
    number: "103",
    name: "Cardiology Lab",
    color: "bg-violet-50",
    borderColor: "border-violet-300",
    procedures: ["echocardiogram", "mri_scan", "ct_scan"],
    capacity: 3,
    equipment: [
      { id: "cl-01", name: "Philips EPIQ CVx Echo Machine", status: "available" },
      { id: "cl-02", name: "EKG Monitor (12-lead)", status: "available" },
      { id: "cl-03", name: "Stress Test Treadmill", status: "available" },
      { id: "cl-04", name: "Defibrillator (Zoll R Series)", status: "available" },
      { id: "cl-05", name: "BP Monitor (continuous)", status: "available" },
      { id: "cl-06", name: "Holter Monitor Kit", status: "in-use" },
    ],
  },
];

export function assignRoom(procedureType: string): HospitalRoom {
  const found = HOSPITAL_ROOMS.find((r) => r.procedures.includes(procedureType));
  return found ?? HOSPITAL_ROOMS[0];
}
