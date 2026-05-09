export type CoverageDetail = {
  covered: boolean;
  coverage_pct: number;
  copay?: number;
  prior_auth_required: boolean;
  notes?: string;
};

export type ProviderCoverage = {
  plan_type: "HMO" | "PPO" | "EPO" | "HDHP" | "Government";
  procedures: Record<string, CoverageDetail>;
};

export const INSURANCE_COVERAGE: Record<string, ProviderCoverage> = {
  Aetna: {
    plan_type: "PPO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 80, prior_auth_required: true, notes: "Pre-auth required within 48 hrs of emergency" },
      heart_surgery: { covered: true, coverage_pct: 80, prior_auth_required: true, notes: "Cardiology specialist referral required" },
      brain_surgery: { covered: true, coverage_pct: 70, prior_auth_required: true, notes: "Neurology review required; experimental procedures may be denied" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 30, prior_auth_required: false },
    },
  },
  "BlueCross BlueShield": {
    plan_type: "PPO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 80, prior_auth_required: true },
      heart_surgery: { covered: true, coverage_pct: 75, prior_auth_required: true, notes: "Second opinion may be required" },
      brain_surgery: { covered: true, coverage_pct: 75, prior_auth_required: true, notes: "Requires pre-certification at least 72 hrs prior" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 25, prior_auth_required: false },
    },
  },
  Cigna: {
    plan_type: "HMO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 90, prior_auth_required: false, notes: "Emergency exception applies" },
      heart_surgery: { covered: true, coverage_pct: 80, prior_auth_required: true, notes: "Must use Cigna network cardiologist" },
      brain_surgery: { covered: false, coverage_pct: 0, prior_auth_required: true, notes: "Not covered under standard HMO — requires specialist referral chain and prior auth" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 20, prior_auth_required: false },
    },
  },
  Humana: {
    plan_type: "HMO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 85, prior_auth_required: true },
      heart_surgery: { covered: true, coverage_pct: 70, prior_auth_required: true, notes: "Pre-authorization required 5 business days in advance" },
      brain_surgery: { covered: true, coverage_pct: 70, prior_auth_required: true, notes: "Case management review required" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 35, prior_auth_required: false },
    },
  },
  Kaiser: {
    plan_type: "HMO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 100, prior_auth_required: false, notes: "Must be performed at Kaiser facility" },
      heart_surgery: { covered: true, coverage_pct: 90, prior_auth_required: true, notes: "Must be at Kaiser facility; out-of-network requires exception" },
      brain_surgery: { covered: true, coverage_pct: 85, prior_auth_required: true, notes: "Kaiser neurologist referral required" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 0, prior_auth_required: false, notes: "Free at Kaiser facilities" },
    },
  },
  Medicare: {
    plan_type: "Government",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 80, prior_auth_required: false, notes: "20% coinsurance after annual deductible ($1,632)" },
      heart_surgery: { covered: true, coverage_pct: 80, prior_auth_required: false, notes: "Part A covers inpatient; Part B covers outpatient surgeon fees" },
      brain_surgery: { covered: true, coverage_pct: 80, prior_auth_required: false, notes: "Must be medically necessary; documented by treating physician" },
      ultrasound: { covered: true, coverage_pct: 80, copay: 0, prior_auth_required: false, notes: "Covered under Part B when ordered by physician" },
    },
  },
  Medicaid: {
    plan_type: "Government",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 100, prior_auth_required: false, notes: "Emergency services always covered" },
      heart_surgery: { covered: true, coverage_pct: 100, prior_auth_required: true, notes: "Coverage and prior auth requirements vary by state" },
      brain_surgery: { covered: true, coverage_pct: 100, prior_auth_required: true, notes: "Varies by state; case management typically involved" },
      ultrasound: { covered: true, coverage_pct: 100, prior_auth_required: false },
    },
  },
  UnitedHealthcare: {
    plan_type: "PPO",
    procedures: {
      appendix_removal: { covered: true, coverage_pct: 80, prior_auth_required: true, notes: "In-network required unless emergency" },
      heart_surgery: { covered: true, coverage_pct: 75, prior_auth_required: true, notes: "Clinical necessity review required" },
      brain_surgery: { covered: true, coverage_pct: 70, prior_auth_required: true, notes: "Neurology board review required for elective procedures" },
      ultrasound: { covered: true, coverage_pct: 100, copay: 30, prior_auth_required: false },
    },
  },
};

const COVERAGE_UNKNOWN: CoverageDetail = {
  covered: false,
  coverage_pct: 0,
  prior_auth_required: false,
  notes: "Coverage not on file — verify directly with insurer",
};

export function getCoverage(provider: string | undefined, procedure: string): CoverageDetail {
  if (!provider) return COVERAGE_UNKNOWN;
  const entry = INSURANCE_COVERAGE[provider];
  if (!entry) return COVERAGE_UNKNOWN;
  return entry.procedures[procedure] ?? {
    covered: true,
    coverage_pct: 80,
    prior_auth_required: false,
    notes: "Standard coverage applies — verify procedure-specific details",
  };
}

export function getPlanType(provider: string | undefined): string {
  if (!provider) return "Unknown";
  return INSURANCE_COVERAGE[provider]?.plan_type ?? "Unknown";
}
