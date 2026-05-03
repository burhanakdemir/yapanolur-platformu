import type { ReactNode } from "react";

/**
 * Üye kayıt formu ve üye paneli: aynı turuncu gradyan kutu (btn-primary paleti).
 */
export function NewAdEmailOptInGradientBox({
  children,
  compact,
}: {
  children: ReactNode;
  /** Üye paneli gibi sıkı düzen */
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[10px] border border-white/30 bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      {children}
    </div>
  );
}
