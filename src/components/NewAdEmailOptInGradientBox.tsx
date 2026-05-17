import type { ComponentProps, ReactNode } from "react";

/** Turuncu gradyan kutu üzerinde görünür onay işareti (beyaz kutu + turuncu tik). */
export const newAdEmailOptInCheckboxClassName =
  "new-ad-email-opt-in-checkbox mt-0.5 shrink-0 cursor-pointer appearance-none rounded border-2 border-white bg-white shadow-sm " +
  "checked:border-white " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " +
  "disabled:cursor-not-allowed disabled:opacity-60";

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  compact?: boolean;
};

export function NewAdEmailOptInCheckbox({ className = "", compact, ...props }: CheckboxProps) {
  const sizeClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <input
      type="checkbox"
      className={`${newAdEmailOptInCheckboxClassName} ${sizeClass} ${className}`.trim()}
      {...props}
    />
  );
}

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
