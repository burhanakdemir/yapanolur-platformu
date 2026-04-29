import type { ReactNode } from "react";

/**
 * Üye kayıt formu ve üye paneli: aynı turuncu gradyan kutu (btn-primary paleti).
 */
export function NewAdEmailOptInGradientBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-white/30 bg-gradient-to-r from-orange-500 to-orange-400 p-3 text-white shadow-sm">
      {children}
    </div>
  );
}
