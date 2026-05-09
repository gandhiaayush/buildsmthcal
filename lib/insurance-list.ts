export const ACCEPTED_INSURANCE = [
  "Aetna",
  "BlueCross BlueShield",
  "Cigna",
  "Humana",
  "Kaiser",
  "Medicare",
  "Medicaid",
  "UnitedHealthcare",
] as const;

export type AcceptedInsurer = (typeof ACCEPTED_INSURANCE)[number];

export function isInsuranceAccepted(provider: string | undefined): boolean {
  if (!provider) return false;
  return ACCEPTED_INSURANCE.some(
    (ins) => ins.toLowerCase() === provider.toLowerCase()
  );
}
