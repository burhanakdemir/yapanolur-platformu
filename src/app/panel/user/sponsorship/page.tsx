import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function UserSponsorshipPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = params.lang === "en" ? "en" : "tr";
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const nextPath = lang === "en" ? "/panel/user/sponsorship?lang=en" : "/panel/user/sponsorship";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      memberNumber: true,
      name: true,
      email: true,
      memberProfile: {
        select: {
          province: true,
          profession: { select: { name: true } },
        },
      },
    },
  });

  if (!dbUser || dbUser.role !== "MEMBER") {
    redirect(lang === "en" ? "/panel/user?lang=en" : "/panel/user");
  }

  let fee = 0;
  let days = 30;
  try {
    const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
    fee = settings?.sponsorHeroFeeAmountTry ?? 0;
    days = settings?.sponsorHeroPeriodDays ?? 30;
  } catch {
    /* Eski şema: sponsor sütunları yoksa varsayılanlar */
  }

  const user = dbUser;

  const displayName = user.name?.trim() || session.email.split("@")[0] || "—";
  const subtitleParts = [user.memberProfile?.profession?.name, user.memberProfile?.province].filter(Boolean);
  const memberLine =
    lang === "tr"
      ? `Üye numaranız: ${user.memberNumber} · ${subtitleParts.length ? subtitleParts.join(" · ") : "Profilinizde meslek ve il görünür"}`
      : `Your member number: ${user.memberNumber} · ${subtitleParts.length ? subtitleParts.join(" · ") : "Profession and province come from your profile"}`;

  const t =
    lang === "tr"
      ? {
          title: "Ana sayfa sponsorluğu",
          back: "Üye paneli",
          intro:
            "Ana sayfadaki kayan sponsor şeridinde markanızın görünmesi için süper yönetici tarafından hesabınız eklenir. Ücret ve süre platform ayarlarından belirlenir.",
          feeLabel: "Liste ücreti (dönem başına)",
          periodLabel: "Varsayılan yayın süresi",
          days: "gün",
          freeHint: fee <= 0 ? "Şu an liste ücreti 0 TL olarak ayarlanmış; yönetim politikanıza göre güncellenebilir." : null,
          memberHint:
            "Başvuru sırasında üye numaranızı iletin; sistem sponsor satırında adınızı ve profilinizdeki meslek / il bilgisini kullanır.",
          topup: "Kredi yükle",
          contact: "İletişim için ana sayfa alt bilgisindeki kanalları kullanabilirsiniz.",
        }
      : {
          title: "Homepage sponsorship",
          back: "Member dashboard",
          intro:
            "A super administrator adds your account to appear in the homepage sponsor ticker. Fee and duration are set in platform settings.",
          feeLabel: "Listed fee (per period)",
          periodLabel: "Default visibility period",
          days: "days",
          freeHint: fee <= 0 ? "The listed fee is currently 0 TRY; your organization may update pricing anytime." : null,
          memberHint:
            "Share your member number when requesting placement; the sponsor line uses your name and profession / province from your profile.",
          topup: "Add credit",
          contact: "Use the contact channels shown in the site footer if needed.",
        };

  const topupHref = lang === "en" ? "/panel/user/topup?lang=en" : "/panel/user/topup";
  const panelHref = lang === "en" ? "/panel/user?lang=en" : "/panel/user";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 md:px-6">
      <Link href={panelHref} className="text-sm font-semibold text-orange-800 underline-offset-2 hover:underline">
        ← {t.back}
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-orange-950">{t.title}</h1>
        <p className="text-sm leading-relaxed text-slate-700">{t.intro}</p>
      </header>

      <section className="glass-card space-y-4 rounded-2xl border border-orange-200/90 p-5">
        <div className="rounded-xl border border-orange-100 bg-orange-50/80 px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold text-orange-950">{displayName}</p>
          <p className="mt-1 text-xs text-slate-600">{memberLine}</p>
          <p className="mt-2 text-xs text-slate-600">{session.email}</p>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-orange-100 pb-2">
            <dt className="font-medium text-slate-600">{t.feeLabel}</dt>
            <dd className="tabular-nums font-semibold text-orange-950">{fee.toLocaleString(lang === "tr" ? "tr-TR" : "en-GB")} ₺</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="font-medium text-slate-600">{t.periodLabel}</dt>
            <dd className="font-semibold text-orange-950">
              {days} {t.days}
            </dd>
          </div>
        </dl>

        {t.freeHint ? <p className="text-xs text-slate-600">{t.freeHint}</p> : null}
        <p className="text-xs leading-relaxed text-slate-600">{t.memberHint}</p>
        <p className="text-xs text-slate-500">{t.contact}</p>

        <Link
          href={topupHref}
          className="btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md"
        >
          {t.topup}
        </Link>
      </section>
    </main>
  );
}
