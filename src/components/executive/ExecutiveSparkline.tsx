/** Sunucu bileşeni — harici chart kütüphanesi yok; hafif SVG çizgi. */

type ExecutiveSparklineProps = {
  title: string;
  subtitle?: string;
  accentClass: string;
  values: number[];
  formatY?: (n: number) => string;
};

export default function ExecutiveSparkline({
  title,
  subtitle,
  accentClass,
  values,
  formatY = (n) => String(n),
}: ExecutiveSparklineProps) {
  const w = 640;
  const h = 112;
  const padX = 6;
  const padY = 10;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const max = Math.max(...values, 1);
  const last = values.length - 1;
  const points =
    last <= 0
      ? `${padX},${h / 2} ${w - padX},${h / 2}`
      : values
          .map((v, i) => {
            const x = padX + (i / last) * innerW;
            const y = padY + innerH - (v / max) * innerH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");

  return (
    <div className="glass-card rounded-xl p-3 shadow-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-orange-100/80 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-orange-950">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        <p className={`text-xs font-medium tabular-nums ${accentClass}`}>
          Son: {formatY(values[last] ?? 0)} · Tepe: {formatY(max)}
        </p>
      </div>
      <svg
        className="mt-2 w-full text-orange-600"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <line
          x1={padX}
          y1={h - padY}
          x2={w - padX}
          y2={h - padY}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={1}
        />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}
