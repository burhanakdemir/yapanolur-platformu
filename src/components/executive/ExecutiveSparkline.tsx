"use client";

/** Harici chart kütüphanesi yok; hafif SVG çizgi. */
import { useMemo, useState, type MouseEvent } from "react";

type ExecutiveSparklineProps = {
  title: string;
  subtitle?: string;
  accentClass: string;
  values: number[];
  yFormat?: "number" | "currency_try";
  xLabels?: string[];
  yAxisLabel?: string;
};

export default function ExecutiveSparkline({
  title,
  subtitle,
  accentClass,
  values,
  yFormat = "number",
  xLabels = [],
  yAxisLabel = "Adet",
}: ExecutiveSparklineProps) {
  const formatY = (n: number) =>
    yFormat === "currency_try"
      ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)
      : new Intl.NumberFormat("tr-TR").format(n);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const w = 640;
  const h = 170;
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 34;
  const marginLeft = 46;
  const chartLeft = marginLeft;
  const chartRight = w - marginRight;
  const chartTop = marginTop;
  const chartBottom = h - marginBottom;
  const innerW = chartRight - chartLeft;
  const innerH = chartBottom - chartTop;
  const max = Math.max(...values, 1);
  const last = values.length - 1;
  const points =
    last <= 0
      ? `${chartLeft},${chartTop + innerH / 2} ${chartRight},${chartTop + innerH / 2}`
      : values
          .map((v, i) => {
            const x = chartLeft + (i / last) * innerW;
            const y = chartTop + innerH - (v / max) * innerH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
  const yMid = Math.round(max / 2);
  const lastValue = values[last] ?? 0;
  const lastX = last <= 0 ? chartRight : chartLeft + innerW;
  const lastY = chartTop + innerH - (lastValue / max) * innerH;
  const hoverSafeIndex = hoverIndex == null ? null : Math.max(0, Math.min(last, hoverIndex));
  const hoverX = useMemo(() => {
    if (hoverSafeIndex == null) return null;
    if (last <= 0) return w / 2;
    return chartLeft + (hoverSafeIndex / last) * innerW;
  }, [chartLeft, hoverSafeIndex, innerW, last, w]);
  const hoverValue = hoverSafeIndex == null ? null : Math.trunc(values[hoverSafeIndex] ?? 0);
  const hoverY =
    hoverSafeIndex == null ? null : chartTop + innerH - ((values[hoverSafeIndex] ?? 0) / max) * innerH;
  const visibleXLabels = useMemo(() => {
    const pick = [0, Math.max(0, Math.floor(last / 2)), Math.max(0, last)];
    return pick.map((idx) => ({ idx, label: formatDateLabel(xLabels[idx] ?? `#${idx + 1}`) }));
  }, [last, xLabels]);
  const hoverLabel =
    hoverSafeIndex == null ? null : formatDateLabel(xLabels[hoverSafeIndex] ?? `#${hoverSafeIndex + 1}`);

  function onLeave() {
    setHoverIndex(null);
  }

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    if (last <= 0) {
      setHoverIndex(0);
      return;
    }
    const clamped = Math.min(chartRight, Math.max(chartLeft, px));
    const ratio = (clamped - chartLeft) / innerW;
    setHoverIndex(Math.round(ratio * last));
  }

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
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <title>{title}</title>
        <text x={chartLeft - 8} y={chartTop + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
          {Math.trunc(max)}
        </text>
        <text
          x={chartLeft - 8}
          y={chartTop + innerH / 2 + 4}
          textAnchor="end"
          className="fill-slate-500 text-[10px]"
        >
          {Math.trunc(yMid)}
        </text>
        <text x={chartLeft - 8} y={chartBottom + 3} textAnchor="end" className="fill-slate-500 text-[10px]">
          0
        </text>
        <text
          x={12}
          y={chartTop + innerH / 2}
          className="fill-slate-500 text-[10px]"
          transform={`rotate(-90 12 ${chartTop + innerH / 2})`}
        >
          {yAxisLabel}
        </text>
        {visibleXLabels.map((tick) => {
          const x = last <= 0 ? chartLeft : chartLeft + (tick.idx / last) * innerW;
          return (
            <text key={`${tick.idx}-${tick.label}`} x={x} y={h - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {tick.label}
            </text>
          );
        })}
        <line
          x1={chartLeft}
          y1={chartBottom}
          x2={chartRight}
          y2={chartBottom}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        <line
          x1={chartLeft}
          y1={chartTop}
          x2={chartLeft}
          y2={chartBottom}
          stroke="currentColor"
          strokeOpacity={0.25}
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
        {hoverX != null && hoverY != null ? (
          <>
            <line
              x1={hoverX}
              y1={chartTop}
              x2={hoverX}
              y2={chartBottom}
              stroke="currentColor"
              strokeOpacity={0.25}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={hoverX} cy={hoverY} r={3.5} fill="currentColor" />
            <rect
              x={Math.max(chartLeft, Math.min(w - 140, hoverX - 70))}
              y={Math.max(chartTop, hoverY - 24)}
              width={140}
              height={16}
              rx={4}
              fill="rgba(15,23,42,0.88)"
            />
            <text
              x={Math.max(chartLeft + 6, Math.min(w - 132, hoverX - 64))}
              y={Math.max(chartTop + 11, hoverY - 12)}
              className="fill-white text-[10px] font-semibold"
            >
              {hoverLabel}: {hoverValue}
            </text>
          </>
        ) : null}
        <circle cx={lastX} cy={lastY} r={3} fill="currentColor" />
        <text
          x={Math.max(chartLeft + 2, lastX - 12)}
          y={Math.max(chartTop + 10, lastY - 8)}
          className="fill-slate-700 text-[10px] font-semibold"
        >
          {Math.trunc(lastValue)}
        </text>
      </svg>
    </div>
  );
}

function formatDateLabel(raw: string): string {
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (daily) {
    return `${daily[3]}.${daily[2]}`;
  }
  const monthly = /^(\d{4})-(\d{2})$/.exec(raw);
  if (monthly) {
    return `${monthly[2]}.${monthly[1].slice(2)}`;
  }
  return raw;
}
