"use client";

/** 0–5 arası puan; turuncu yıldızlar, kısmi dolgu destekler. */
export default function MemberStarRating({
  score,
  className = "",
  /** Koyu hero kartında: boş/dolu yıldız renkleri yer değiştirir, rakam açık renk. */
  tone = "default",
}: {
  score: number;
  className?: string;
  tone?: "default" | "inverted";
}) {
  const s = Math.min(5, Math.max(0, score));
  const baseStar = tone === "inverted" ? "text-orange-500" : "text-slate-200";
  const fillStar = tone === "inverted" ? "text-slate-200" : "text-orange-500";
  const scoreText = tone === "inverted" ? "text-orange-50" : "text-orange-800";
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`Puan: ${s.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, s - i));
        return (
          <span key={i} className="relative inline-block h-7 w-7 shrink-0 select-none">
            <span
              className={`absolute inset-0 flex items-center justify-center text-[1.35rem] leading-none ${baseStar}`}
            >
              ★
            </span>
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
              aria-hidden
            >
              <span
                className={`flex h-7 w-7 items-center justify-center text-[1.35rem] leading-none ${fillStar}`}
              >
                ★
              </span>
            </span>
          </span>
        );
      })}
      <span className={`ml-1 tabular-nums text-sm font-semibold ${scoreText}`}>{s.toFixed(1)}</span>
    </div>
  );
}
