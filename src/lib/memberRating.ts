/**
 * En fazla 3 belge → 3 yıldıza kadar (belge başına 1).
 * Beğeniler: her 10 beğeni = +1 yıldız (UI: her 2 beğeni +0,2); beğeni katkısı en fazla +2.
 * Beğenmeme: aynı oranda (−1 yıldız / 10 beğenmeme); en fazla −2; beğeni ile aynı miktarda etki.
 * Toplam 0–5 arası.
 */
export function computeMemberStarScore(docCount: number, likeCount: number, dislikeCount: number): number {
  const docStars = Math.min(3, Math.max(0, docCount));
  const likeBonus = Math.min(2, Math.max(0, likeCount) / 10);
  const dislikePenalty = Math.min(2, Math.max(0, dislikeCount) / 10);
  return Math.min(5, Math.max(0, docStars + likeBonus - dislikePenalty));
}
