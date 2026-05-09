import type { PrepInstruction } from "@/types";

export const PREP_INSTRUCTIONS: Record<string, PrepInstruction> = {
  appendix_removal: {
    procedure: "appendix_removal",
    one_week_before: [
      "Stop blood thinners and aspirin (confirm with doctor)",
      "Arrange transportation — you cannot drive after surgery",
      "No food or drink for 12 hours before procedure",
    ],
    two_days_before: [
      "Confirm your ride is arranged",
      "Prepare an overnight bag (2–3 day stay likely)",
      "Review and sign consent forms if not done",
    ],
  },
  heart_surgery: {
    procedure: "heart_surgery",
    one_week_before: [
      "Stop specific medications as directed by cardiologist",
      "Follow cardiac diet — no high-sodium foods",
      "No alcohol or tobacco",
    ],
    two_days_before: [
      "Nothing by mouth after midnight",
      "Shower with surgical soap the night before",
      "Confirm caregiver is available for 4–6 week recovery",
    ],
  },
  brain_surgery: {
    procedure: "brain_surgery",
    one_week_before: [
      "Full medication review with neurologist",
      "Arrange 2-week post-op recovery support at home",
      "No supplements, herbal remedies, or blood thinners",
    ],
    two_days_before: [
      "Nothing by mouth after midnight",
      "Remove nail polish, jewelry, and piercings",
      "Confirm escort — you will not be able to drive",
    ],
  },
  ultrasound: {
    procedure: "ultrasound",
    one_week_before: [
      "No special preparation typically required",
      "Stay well hydrated leading up to the appointment",
    ],
    two_days_before: [
      "If abdominal ultrasound: drink 32oz of water 1 hour before, do not urinate",
      "Wear loose, comfortable clothing",
      "No special diet restrictions",
    ],
  },
};

export function getPrepInstructions(procedure: string): PrepInstruction {
  return (
    PREP_INSTRUCTIONS[procedure] ?? {
      procedure,
      one_week_before: [
        "Follow any instructions provided by your doctor",
        "Avoid strenuous activity 24 hours before the appointment",
      ],
      two_days_before: [
        "Confirm your appointment details",
        "Arrange transportation if needed",
      ],
    }
  );
}

export function formatProcedureName(procedure: string): string {
  return procedure
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
