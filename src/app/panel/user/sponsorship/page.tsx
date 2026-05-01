import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { mergeSponsorHeroPricingFromDb, type SponsorHeroPricingTry } from "@/lib/sponsorHeroPricing";
import { sumUserCreditTry } from "@/lib/userCredit";
import UserSponsorshipClient from "./user-sponsorship-client";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

const emptyPricing = (): SponsorHeroPricingTry =>
  ({
    "4": 0,
    "7": 0,
    "10": 0,
    "15": 0,
    "30": 0,
  }) satisfies SponsorHeroPricingTry;

export default async function UserSponsorshipPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = params.lang === "en" ? "en" : "tr";
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const nextPath = lang === "en" ? "/panel/user/sponsorship?lang=en" : "/panel/user/sponsorship";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const prisma = getPrismaClient();
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

  let balanceTry = 0;
  try {
    balanceTry = await sumUserCreditTry(session.userId);
  } catch {
    balanceTry = 0;
  }

  let pricing: SponsorHeroPricingTry = emptyPricing();
  try {
    const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
    if (settings) pricing = mergeSponsorHeroPricingFromDb(settings);
  } catch {
    /* Eski şema */
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
            "Ödeme veya ücretsiz başvuru yöneticiler tarafından onaylandıktan sonra ana sayfa sponsor şeridinde yer alırsınız. Aşağıda paket ücretlerini görebilirsiniz; bakiyeniz yeterliyse «Öde» ile tahsilat yapılır, yetersizse kredi yükleyebilirsiniz.",
          contact: "İletişim için ana sayfa alt bilgisindeki kanalları kullanabilirsiniz.",
          choosePeriod: "Tercih ettiğiniz yayın süresi",
          feeForPeriod: "Seçilen süre için listelenen ücret",
          daysSuffix: "gün",
          hintSelected:
            "Ödeme onay bekleyen başvuruya düşer; yönetici onayından sonra yayın başlar. Reddedilirse ücret bakiyenize iade edilir.",
          balanceLabel: "Mevcut bakiye",
          payCta: "Öde",
          paying: "İşleniyor…",
          topupCta: "Kredi yükle",
          insufficientHint:
            "Bu paket için bakiyeniz yetersiz. Kredi yükleyerek devam edebilirsiniz.",
          successPendingApproval:
            "Ücret bakiyeden düşüldü. Başvurunuz yönetici onayına iletildi; onayda yayın başlar, redde ücret iade edilir.",
          successPendingApprovalFree:
            "Başvurunuz yönetici onayına iletildi (ücret alınmadı). Onayda yayın başlar.",
          freePackageHint:
            "Bu süre için liste ücreti 0 TL; yine yönetici onayı gerekir.",
          submitFreeCta: "Ücretsiz başvuruda bulun",
          duplicatePending:
            "Zaten onay bekleyen bir başvurunuz var. Sonuçlanmasını bekleyin.",
          memberHint:
            "Başvuru sırasında üye numaranızı iletin; sistem sponsor satırında adınızı ve profilinizdeki meslek / il bilgisini kullanır.",
        }
      : {
          title: "Homepage sponsorship",
          back: "Member dashboard",
          intro:
            "After you pay (or submit a free tier), administrators review your request. Once approved, your sponsor line goes live on the homepage; if declined, any charge is refunded to your balance.",
          contact: "Use the contact channels shown in the site footer if needed.",
          choosePeriod: "Preferred visibility period",
          feeForPeriod: "Listed fee for the selected period",
          daysSuffix: "days",
          hintSelected:
            "Payment becomes a pending request; admins approve or decline (declines refund paid amounts).",
          balanceLabel: "Current balance",
          payCta: "Pay",
          paying: "Processing…",
          topupCta: "Add credit",
          insufficientHint: "Your balance is too low for this package. Add credit to continue.",
          successPendingApproval:
            "The fee was deducted. Your request is pending admin approval; if declined, you will be refunded.",
          successPendingApprovalFree:
            "Your application was sent for admin approval (no charge). It goes live once approved.",
          freePackageHint: "This duration is listed at 0 TRY; admin approval still applies.",
          submitFreeCta: "Submit free application",
          duplicatePending: "You already have a pending application. Please wait for it to be resolved.",
          memberHint:
            "Share your member number when requesting placement; the sponsor line uses your name and profession / province from your profile.",
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
        <p className="text-xs leading-relaxed text-slate-600">{t.memberHint}</p>
        <p className="text-xs text-slate-500">{t.contact}</p>
      </section>

      <UserSponsorshipClient
        lang={lang}
        pricing={pricing}
        balanceTry={balanceTry}
        topupHref={topupHref}
        labels={{
          choosePeriod: t.choosePeriod,
          feeForPeriod: t.feeForPeriod,
          daysSuffix: t.daysSuffix,
          hintSelected: t.hintSelected,
          balanceLabel: t.balanceLabel,
          payCta: t.payCta,
          paying: t.paying,
          topupCta: t.topupCta,
          insufficientHint: t.insufficientHint,
          successPendingApproval: t.successPendingApproval,
          freePackageHint: t.freePackageHint,
          submitFreeCta: t.submitFreeCta,
          duplicatePending: t.duplicatePending,
          successPendingApprovalFree: t.successPendingApprovalFree,
        }}
      />
    </main>
  );
}
