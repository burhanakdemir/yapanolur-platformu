/** API anahtarı: tam değer yerine maske; log ve teşhis için. */
export function fingerprintIletiApiKey(key: string): string {
  const t = key.trim();
  if (!t) return "∅";
  if (t.length <= 4) return "****";
  return "•".repeat(6) + t.slice(-4);
}

export function senderHintMask(sender: string): string {
  const t = sender.trim();
  if (!t) return "∅";
  if (t.length <= 2) return "**";
  return t.slice(0, 2) + "•".repeat(Math.min(8, t.length - 2)) + (t.length > 2 ? t.slice(-2) : "");
}
