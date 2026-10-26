export const APPLICANT_CORE_FIELD_NAMES = [
  "firstName",
  "lastName",
  "email",
  "telephone",
] as const;

export const CORE_PROGRAM_FIELD_NAMES = new Set<string>([
  ...APPLICANT_CORE_FIELD_NAMES,
  "program",
]);

export function usesCoreApplicantFields(serialized?: string): boolean {
  if (!serialized) return false;
  try {
    return JSON.parse(serialized)?.version === 2;
  } catch {
    return false;
  }
}
