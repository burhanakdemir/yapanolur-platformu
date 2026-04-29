/** Türkiye için telefonu normalize eder (örn. +905551234567). */
export function normalizeTrPhone(input: string): string | null {
  const raw = input.trim().replace(/\s/g, "");
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length >= 12) {
    return `+${d}`;
  }
  if (d.startsWith("0") && d.length === 11) {
    d = "90" + d.slice(1);
    return `+${d}`;
  }
  if (d.length === 10) {
    return `+90${d}`;
  }
  if (d.length >= 10 && d.length <= 15) {
    return `+${d}`;
  }
  return null;
}
