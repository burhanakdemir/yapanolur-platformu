/**
 * Oy bildirimi e-postası gönderme kuralları (spam azaltma).
 * Yeni oluşturma veya LIKE ↔ DISLIKE değişiminde bildir; aynı türü tekrar seçince gönderme.
 */
export function shouldSendPeerVoteEmail(
  action: "like" | "dislike" | "clear",
  existing: { type: "LIKE" | "DISLIKE" } | null,
): boolean {
  if (action === "clear") return false;
  if (action === "like") return !existing || existing.type !== "LIKE";
  return !existing || existing.type !== "DISLIKE";
}
