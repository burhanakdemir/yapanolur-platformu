import type { Metadata } from "next";

/** Önbelleğe alınmış kabuk /members yükleme takılmasını azaltır. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
