/** Rakam dışını atar (TC / VKN girişi için). */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/** Türkiye TC Kimlik No doğrulaması (11 hane, kontrol basamakları). */
export function isValidTcKimlik(tc: string): boolean {
  const d = digitsOnly(tc);
  if (d.length !== 11) return false;
  if (d[0] === "0") return false;
  const n = d.split("").map((c) => Number(c));
  const odd = n[0]! + n[2]! + n[4]! + n[6]! + n[8]!;
  const even = n[1]! + n[3]! + n[5]! + n[7]!;
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (n[9] !== d10) return false;
  const sumFirst10 = n.slice(0, 10).reduce((a, b) => a + b, 0);
  return n[10] === sumFirst10 % 10;
}

/** Kurumsal VKN: 10 hane sayı (basit biçim kontrolü; mali müşavir onayı belgelerle sağlanır). */
export function isValidVknFormat(vkn: string): boolean {
  const d = digitsOnly(vkn);
  return d.length === 10 && /^\d{10}$/.test(d);
}
