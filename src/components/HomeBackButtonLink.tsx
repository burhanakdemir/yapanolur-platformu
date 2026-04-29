import Link from "next/link";
import type { ComponentProps } from "react";

/** Ana sayfa / geri dönüş — `chip` yerine turuncu birincil buton görünümü (tutarlı padding ve punto). */
export const homeBackPrimaryClassName =
  "btn-primary inline-flex min-h-[48px] w-fit max-w-full items-center justify-center gap-1 rounded-xl px-5 py-3 text-base font-semibold touch-manipulation shadow-sm transition hover:opacity-95 active:scale-[0.98]";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

export default function HomeBackButtonLink({ className = "", ...props }: Props) {
  return (
    <Link {...props} className={[homeBackPrimaryClassName, className].filter(Boolean).join(" ")} />
  );
}
