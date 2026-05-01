type Row = { province: string; count: number };

type ExecutiveProvinceBarsProps = {
  title: string;
  subtitle?: string;
  rows: Row[];
  emptyHint?: string;
};

export default function ExecutiveProvinceBars({
  title,
  subtitle,
  rows,
  emptyHint = "Bu liste için kayıt yok.",
}: ExecutiveProvinceBarsProps) {
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="glass-card rounded-xl p-4 shadow-md">
      <h3 className="text-sm font-semibold text-orange-950">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.province}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-slate-800">{r.province}</span>
                <span className="shrink-0 tabular-nums text-slate-600">{r.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-orange-100/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
