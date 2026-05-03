import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDashboardDateRange } from "@/lib/date-range";
import AdTitleEditor from "@/components/AdTitleEditor";
import UserShowcaseList from "@/components/UserShowcaseList";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import MemberStarRating from "@/components/MemberStarRating";
import MemberPanelCommentReplies from "@/components/MemberPanelCommentReplies";
import UserDashboardStatTiles from "@/components/UserDashboardStatTiles";
import UserPanelHeroDocuments from "@/components/UserPanelHeroDocuments";
import UserPanelDateRange from "@/components/UserPanelDateRange";
import { buildMemberRatingPayload } from "@/lib/memberRatingPayload";
import { sumUserCreditTry } from "@/lib/userCredit";
import PanelCollapsibleSection from "@/components/PanelCollapsibleSection";
import UserPanelNewAdEmailOptIn from "@/components/UserPanelNewAdEmailOptIn";
import { dictionary } from "@/lib/i18n";
import { getUserNewAdEmailOptIn } from "@/lib/userNewAdEmailOptIn";

type Props = {
  searchParams: Promise<{ lang?: string; from?: string; to?: string }>;
};

type LikedMemberVoteRow = {
  updatedAt: Date;
  toUser: { id: string; name: string | null; memberNumber: number };
};

function LikedMemberLine({
  row,
  lang,
  dateLabel,
  memberNoLabel,
}: {
  row: LikedMemberVoteRow;
  lang: "tr" | "en";
  dateLabel: string;
  memberNoLabel: string;
}) {
  const u = row.toUser;
  const displayName = u.name?.trim() || "—";
  const href = lang === "en" ? `/uye/${u.id}?lang=en` : `/uye/${u.id}`;
  const likedAt = new Date(row.updatedAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="group block min-w-0 px-2 py-0.5 text-left text-[11px] leading-snug text-slate-600 transition-colors hover:bg-orange-100 hover:text-orange-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-orange-500"
      >
        <span className="flex min-w-0 flex-nowrap items-center gap-x-2">
          <span className="shrink-0 whitespace-nowrap text-slate-500 group-hover:text-orange-950">
            <span className="font-medium">{dateLabel}: </span>
            {likedAt}
          </span>
          <span className="shrink-0 text-slate-300 group-hover:text-orange-300/80" aria-hidden>
            ·
          </span>
          <span className="shrink-0 whitespace-nowrap tabular-nums group-hover:text-orange-950">
            {memberNoLabel}{" "}
            <span className="font-mono font-semibold text-slate-800 group-hover:text-orange-950">
              {u.memberNumber}
            </span>
          </span>
          <span className="shrink-0 text-slate-300 group-hover:text-orange-300/80" aria-hidden>
            ·
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-orange-800 no-underline group-hover:text-orange-950">
            {displayName}
          </span>
        </span>
      </Link>
    </li>
  );
}

type WatchedAdRow = {
  createdAt: Date;
  ad: {
    id: string;
    listingNumber: number;
    title: string;
  };
};

function WatchedAdLine({
  row,
  lang,
  dateLabel,
  listingNoLabel,
}: {
  row: WatchedAdRow;
  lang: "tr" | "en";
  dateLabel: string;
  listingNoLabel: string;
}) {
  const ad = row.ad;
  const title = displayAdTitle(ad.title);
  const href = lang === "en" ? `/ads/${ad.id}?lang=en` : `/ads/${ad.id}`;
  const watchedAt = new Date(row.createdAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="group block min-w-0 px-2 py-0.5 text-left text-[11px] leading-snug text-slate-600 transition-colors hover:bg-orange-100 hover:text-orange-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-orange-500"
      >
        <span className="flex min-w-0 flex-nowrap items-center gap-x-2">
          <span className="shrink-0 whitespace-nowrap text-slate-500 group-hover:text-orange-950">
            <span className="font-medium">{dateLabel}: </span>
            {watchedAt}
          </span>
          <span className="shrink-0 text-slate-300 group-hover:text-orange-300/80" aria-hidden>
            ·
          </span>
          <span className="shrink-0 whitespace-nowrap tabular-nums group-hover:text-orange-950">
            {listingNoLabel}{" "}
            <span className="font-mono font-semibold text-slate-800 group-hover:text-orange-950">
              {ad.listingNumber}
            </span>
          </span>
          <span className="shrink-0 text-slate-300 group-hover:text-orange-300/80" aria-hidden>
            ·
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-orange-800 no-underline group-hover:text-orange-950">
            {title}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function UserPanelPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = params.lang === "en" ? "en" : "tr";
  const dateRange = resolveDashboardDateRange(params.from, params.to);
  const { since, until, fromIso, toIso, usedDefaultRange } = dateRange;
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const nextPath = lang === "en" ? "/panel/user?lang=en" : "/panel/user";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const panelUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      memberNumber: true,
      profilePhotoUrl: true,
      name: true,
      isMemberApproved: true,
      memberProfile: {
        select: {
          documents: {
            select: { id: true, type: true, fileUrl: true },
            orderBy: { type: "asc" },
          },
        },
      },
    },
  });

  /** JWT içindeki rol bazen güncel olmayabilir; üye arayüzü DB rolüne göre. */
  const isMemberAccount = panelUser?.role === "MEMBER";

  const t =
    lang === "tr"
      ? {
          panelTitle: "Üye paneli",
          tagline:
            "İlanlarınızı yönetin, teklif verin, profilinizi güçlendirin — tek ekrandan devam edin.",
          pendingApprovalTitle: "Üyelik onayı bekleniyor",
          pendingApprovalBody:
            "Kaydınız yönetici onayına sunuldu. Onaylanana kadar bazı işlemler kısıtlı olabilir; bilgilerinizi bu panelden takip edebilirsiniz.",
          activeUser: "Oturum",
          home: "Ana sayfa",
          newAd: "Yeni ilan ver",
          profileDocs: "Profil ve belgeler",
          workExperience: "İş deneyimi",
          workExperienceDesc: "Tamamlanan işleri ekleyin; profilinizde listelenir.",
          engineerSearch: "Mühendis ara",
          topup: "Bakiye yükle",
          sponsorHero: "Ana sayfa sponsorluğu",
          sponsorHeroDesc: "Üst şerit görünürlüğü ve ücret bilgisi.",
          sponsorStripDesc:
            "Ana sayfadaki kayan sponsor şeridinde görünmek için 4–30 gün arası paket ücretleri platform ayarlarındadır; süper yönetici üye numaranızla yayını ekler.",
          sponsorStripCta: "Bilgi ve ücretler",
          rangeLabel: "Özet dönemi",
          rangeStart: "Başlangıç",
          rangeEnd: "Bitiş",
          rangeReset: "Son 30 gün",
          rangeHint: "Tarih seçilmediğinde son 30 gün kullanılır.",
          statListings: "İlanlarım",
          statBids: "Verdiğim teklifler",
          statPending: "Onay bekleyen",
          statPayments: "Başarılı ödeme",
          statTileClickHint: "Ayrıntılar için tıklayın",
          statModalClose: "Kapat",
          statModalEmpty: "Gösterilecek kayıt yok.",
          statAmountLabel: "Tutar",
          statDateLabel: "Tarih",
          statProviderLabel: "Sağlayıcı",
          myAdsTitle: "İlanlarım — başlık düzenle",
          myAdsDesc: "Yayında veya onay bekleyen ilanlarınızın başlığını buradan güncelleyebilirsiniz.",
          status: "Durum",
          listingPage: "İlan sayfası",
          watchedTitle: "Takip ettiklerim",
          watchedDesc: "Takibe aldığınız ilanlar. Satıra tıklayarak ilan sayfasına gidebilirsiniz.",
          watchedEmpty: "Henüz takibe aldığınız ilan yok. Beğendiğiniz ilanlarda “Takibe al”ı kullanın.",
          watchedRowDateLabel: "Takip",
          watchedListingNoLabel: "İlan no",
          likedMembersTitle: "Beğendiklerim",
          likedMembersDesc:
            "Üye profillerinde beğeni verdiğiniz onaylı üyeler. Satıra tıklayarak profile gidebilirsiniz.",
          likedMembersEmpty: "Henüz bir üyeyi beğenmediniz.",
          likedMembersDateLabel: "Beğenme",
          likedMembersMemberNoLabel: "Üye no",
          pinSectionKeep: "İçeriği açık tut",
          pinSectionRelease: "Sabitlemeyi kaldır",
          showcaseTitle: "Vitrin ilanları",
          commentsTitle: "Profilinize gelen yorumlar",
          commentsDesc:
            "Diğer üyelerin ücret karşılığı yazdığı yorumlar burada. Her yoruma tek seferlik (aynı yorum ücreti kadar kredi) cevap verebilirsiniz; cevap profil sayfanızda da görünür.",
          profileLink: "Profil bağlantınız",
          commentsEmpty: "Henüz profilinize yorum yapılmamış.",
          scoreLabel: "Profil puanı",
          balanceLabel: "Bakiye",
          scoreError: "Puan yüklenemedi",
          profilePhotoAlt: "Profil fotoğrafı",
          memberDocsTitle: "Üye belgeleri",
          docDiploma: "Diploma",
          docEngineering: "Hizmet yeterliliği",
          docTax: "Vergi levhası",
          docEnlarge: "Büyütmek için tıklayın",
          docClose: "Kapat",
          newAdEmailSectionTitle: "E-posta bildirimleri",
          newAdEmailSaved: "Tercihiniz kaydedildi.",
          newAdEmailSaving: "Kaydediliyor…",
          newAdEmailError: "Kaydedilemedi. Tekrar deneyin.",
        }
      : {
          panelTitle: "Member dashboard",
          tagline: "Manage listings, place bids, and grow your profile — all in one place.",
          pendingApprovalTitle: "Membership pending approval",
          pendingApprovalBody:
            "Your registration is awaiting administrator approval. Some actions may be limited until then.",
          activeUser: "Signed in as",
          home: "Home",
          newAd: "Post a listing",
          profileDocs: "Profile & documents",
          workExperience: "Work experience",
          workExperienceDesc: "Add completed jobs; shown on your profile.",
          engineerSearch: "Find engineers",
          topup: "Add credit",
          sponsorHero: "Homepage sponsorship",
          sponsorHeroDesc: "Ticker placement and pricing info.",
          sponsorStripDesc:
            "4–30 day package fees follow platform settings; a super administrator activates your row using your member number.",
          sponsorStripCta: "Pricing & details",
          rangeLabel: "Summary period",
          rangeStart: "Start",
          rangeEnd: "End",
          rangeReset: "Last 30 days",
          rangeHint: "If no dates are selected, the last 30 days are used.",
          statListings: "My listings",
          statBids: "Bids placed",
          statPending: "Pending approval",
          statPayments: "Successful payments",
          statTileClickHint: "Click for details",
          statModalClose: "Close",
          statModalEmpty: "No records to show.",
          statAmountLabel: "Amount",
          statDateLabel: "Date",
          statProviderLabel: "Provider",
          myAdsTitle: "My listings — edit title",
          myAdsDesc: "Update titles for listings that are live or awaiting approval.",
          status: "Status",
          listingPage: "View listing",
          watchedTitle: "Watched listings",
          watchedDesc: "Listings you are watching. Click a row to open the listing page.",
          watchedEmpty: "You have not watched any listings yet. Use “Watch” on a listing card.",
          watchedRowDateLabel: "Watching",
          watchedListingNoLabel: "Listing no.",
          likedMembersTitle: "Members you liked",
          likedMembersDesc:
            "Approved members you liked on their profile. Click a row to open their profile.",
          likedMembersEmpty: "You have not liked any member yet.",
          likedMembersDateLabel: "Liked",
          likedMembersMemberNoLabel: "Member no.",
          pinSectionKeep: "Keep expanded",
          pinSectionRelease: "Unpin",
          showcaseTitle: "Showcase listings",
          commentsTitle: "Comments on your profile",
          commentsDesc:
            "Comments others paid to post on your profile. You can post one paid reply per comment (same fee as posting a comment); replies show on your public profile.",
          profileLink: "Your profile URL",
          commentsEmpty: "No comments on your profile yet.",
          scoreLabel: "Profile score",
          balanceLabel: "Balance",
          scoreError: "Could not load score",
          profilePhotoAlt: "Profile photo",
          memberDocsTitle: "Member documents",
          docDiploma: "Diploma",
          docEngineering: "Service certificate",
          docTax: "Tax certificate",
          docEnlarge: "Click to enlarge",
          docClose: "Close",
          newAdEmailSectionTitle: "Email notifications",
          newAdEmailSaved: "Your preference was saved.",
          newAdEmailSaving: "Saving…",
          newAdEmailError: "Could not save. Try again.",
        };

  const displayName =
    panelUser?.name?.trim() || session.email.split("@")[0] || "?";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const heroMemberDocuments = panelUser?.memberProfile?.documents ?? [];

  const [myAds, myBids, pendingMine, paidOrders] = session
    ? await Promise.all([
        prisma.ad.count({ where: { ownerId: session.userId } }),
        prisma.bid.count({
          where: { bidderId: session.userId, createdAt: { gte: since, lte: until } },
        }),
        prisma.ad.count({
          where: { ownerId: session.userId, status: "PENDING", createdAt: { gte: since, lte: until } },
        }),
        prisma.paymentOrder.count({
          where: { userId: session.userId, status: "PAID", createdAt: { gte: since, lte: until } },
        }),
      ])
    : [0, 0, 0, 0];
  const [myAdsList, settings, watchedAds, likedMemberVotes] = session
    ? await Promise.all([
        prisma.ad.findMany({
          where: { ownerId: session.userId },
          select: { id: true, title: true, status: true, showcaseUntil: true },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        prisma.adminSettings.upsert({
          where: { id: "singleton" },
          update: {},
          create: { id: "singleton" },
        }),
        prisma.adWatch.findMany({
          where: { userId: session.userId, ad: { status: "APPROVED" } },
          select: {
            createdAt: true,
            ad: {
              select: {
                id: true,
                listingNumber: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        prisma.memberPeerVote.findMany({
          where: {
            fromUserId: session.userId,
            type: "LIKE",
            toUser: {
              role: "MEMBER",
              isMemberApproved: true,
              memberProfile: { isNot: null },
            },
          },
          select: {
            updatedAt: true,
            toUser: {
              select: { id: true, name: true, memberNumber: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 200,
        }),
      ])
    : [[], { showcaseFeeAmountTry: 250, showcaseDailyPricingJson: "{}" }, [], []];

  const [statBidsDetail, statPendingDetail, statPaymentsDetail] = session
    ? await Promise.all([
        prisma.bid.findMany({
          where: { bidderId: session.userId, createdAt: { gte: since, lte: until } },
          select: {
            id: true,
            amountTry: true,
            createdAt: true,
            ad: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        prisma.ad.findMany({
          where: {
            ownerId: session.userId,
            status: "PENDING",
            createdAt: { gte: since, lte: until },
          },
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        prisma.paymentOrder.findMany({
          where: {
            userId: session.userId,
            status: "PAID",
            createdAt: { gte: since, lte: until },
          },
          select: {
            id: true,
            amountTry: true,
            createdAt: true,
            paidAt: true,
            provider: true,
          },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
      ])
    : [[], [], []];

  const statTilesListings = myAdsList.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
  }));
  const statTilesBids = statBidsDetail.map((b) => ({
    id: b.id,
    amountTry: b.amountTry,
    createdAt: b.createdAt.toISOString(),
    adId: b.ad.id,
    adTitle: b.ad.title,
  }));
  const statTilesPending = statPendingDetail.map((a) => ({
    id: a.id,
    title: a.title,
    createdAt: a.createdAt.toISOString(),
  }));
  const statTilesPayments = statPaymentsDetail.map((p) => ({
    id: p.id,
    amountTry: p.amountTry,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    provider: String(p.provider),
  }));

  let memberStarScore: number | null = null;
  let memberBalanceTry = 0;
  let profileCommentsReceived: {
    id: string;
    body: string;
    createdAt: Date;
    replyBody: string | null;
    repliedAt: Date | null;
    fromUser: { memberNumber: number; name: string | null };
  }[] = [];

  if (isMemberAccount) {
    try {
      memberBalanceTry = await sumUserCreditTry(session.userId);
    } catch (e) {
      console.error("[panel/user] balance", e);
      memberBalanceTry = 0;
    }
    try {
      const ratingPayload = await buildMemberRatingPayload(prisma, session.userId, null, {
        allowUnapprovedTarget: true,
      });
      memberStarScore = ratingPayload?.score ?? null;
    } catch (e) {
      console.error("[panel/user] rating", e);
      memberStarScore = null;
    }
    try {
      profileCommentsReceived = await prisma.memberComment.findMany({
        where: { toUserId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          body: true,
          createdAt: true,
          replyBody: true,
          repliedAt: true,
          fromUser: { select: { memberNumber: true, name: true } },
        },
      });
    } catch (e) {
      console.error("[panel/user] comments", e);
      profileCommentsReceived = [];
    }
  }

  const showPendingBanner = isMemberAccount && panelUser && !panelUser.isMemberApproved;

  const newAdEmailOptIn = isMemberAccount ? await getUserNewAdEmailOptIn(session.userId) : false;

  return (
    <main className="admin-canvas min-h-screen">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-4 sm:px-6 sm:py-5 lg:py-6">
        {showPendingBanner ? (
          <div
            className="rounded-xl border border-amber-400/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            role="status"
          >
            <p className="font-semibold">{t.pendingApprovalTitle}</p>
            <p className="mt-1 leading-relaxed text-amber-900/95">{t.pendingApprovalBody}</p>
          </div>
        ) : null}
        {/* Hero */}
        <header className="overflow-hidden rounded-2xl border border-white/40 bg-white/75 shadow-xl shadow-orange-900/5 backdrop-blur-md">
          <div className="admin-hero px-4 py-4 text-white sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    {panelUser?.profilePhotoUrl ? (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white/50 shadow-lg shadow-black/20 sm:h-24 sm:w-24">
                        <Image
                          src={panelUser.profilePhotoUrl}
                          alt={t.profilePhotoAlt}
                          fill
                          sizes="(min-width: 640px) 96px, 80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-white/15 text-2xl font-bold text-white shadow-inner sm:h-24 sm:w-24 sm:text-3xl"
                        aria-hidden
                      >
                        {avatarInitial}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2 text-center sm:text-left">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.panelTitle}</h1>
                    <p className="max-w-xl text-sm leading-relaxed text-orange-50/95 sm:text-base">{t.tagline}</p>
                  </div>
                </div>
                <Link
                  href={`/?lang=${lang}`}
                  className="inline-flex shrink-0 items-center justify-center self-center rounded-xl border border-white/35 bg-white/15 px-4 py-2 text-center text-sm font-semibold backdrop-blur transition hover:bg-white/25 sm:self-start"
                >
                  {t.home}
                </Link>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:gap-3 lg:gap-4">
                {isMemberAccount ? (
                  <div className="flex w-fit shrink-0 justify-center sm:justify-start">
                    <div className="rounded-lg border border-white/40 bg-white/12 px-2.5 py-2 text-center backdrop-blur">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-100">
                        {t.scoreLabel}
                      </p>
                      {memberStarScore !== null ? (
                        <MemberStarRating
                          score={memberStarScore}
                          tone="inverted"
                          className="mt-0.5 origin-top scale-[0.82] justify-center sm:scale-90"
                        />
                      ) : (
                        <p className="mt-1 text-[10px] text-orange-100/90">{t.scoreError}</p>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="mx-auto flex w-fit max-w-full min-w-0 flex-col gap-1.5 text-center sm:mx-0 sm:text-left">
                    <p className="text-sm text-white/95">
                      <span className="font-medium text-orange-100">{t.activeUser}:</span>{" "}
                      <span className="break-all font-mono text-[0.9em] opacity-95">{session?.email ?? "—"}</span>
                    </p>
                    {isMemberAccount ? (
                      <p className="text-base font-semibold tabular-nums tracking-tight text-white sm:text-lg">
                        {t.balanceLabel}: {memberBalanceTry} TL
                      </p>
                    ) : null}
                  </div>
                  {heroMemberDocuments.length > 0 ? (
                    <UserPanelHeroDocuments
                      variant="inline"
                      documents={heroMemberDocuments}
                      labels={{
                        sectionTitle: t.memberDocsTitle,
                        diploma: t.docDiploma,
                        engineering: t.docEngineering,
                        tax: t.docTax,
                        enlargeHint: t.docEnlarge,
                        close: t.docClose,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        {isMemberAccount ? (
          <section
            aria-labelledby="panel-star-system-title"
            className="rounded-2xl border-2 border-orange-400 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 shadow-md sm:p-5"
          >
            <h2 id="panel-star-system-title" className="text-lg font-bold text-orange-950 sm:text-xl">
              {dictionary[lang].memberPage.panelStarBannerTitle}
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800 sm:text-[0.95rem]">
              {dictionary[lang].memberPage.panelStarBannerLines.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg border border-orange-200/80 bg-orange-50/90 px-3 py-2 text-sm font-semibold text-orange-950">
              {dictionary[lang].memberPage.panelStarBannerDocsCta}
            </p>
          </section>
        ) : null}

        {isMemberAccount ? (
          <section
            aria-labelledby="panel-sponsor-strip-title"
            className="rounded-2xl border border-amber-400/80 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4 shadow-md sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 id="panel-sponsor-strip-title" className="text-lg font-bold text-amber-950">
                  {t.sponsorHero}
                </h2>
                <p className="text-sm leading-relaxed text-slate-700">{t.sponsorStripDesc}</p>
                <p className="text-xs font-medium tabular-nums text-amber-900/90">
                  {lang === "tr" ? "Üye numaranız:" : "Member no."}{" "}
                  <span className="font-mono">{panelUser?.memberNumber ?? "—"}</span>
                </p>
              </div>
              <Link
                href={lang === "en" ? "/panel/user/sponsorship?lang=en" : "/panel/user/sponsorship"}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-800 to-orange-600 px-5 py-2.5 text-center text-sm font-bold text-white shadow-md transition hover:opacity-95"
              >
                {t.sponsorStripCta}
              </Link>
            </div>
          </section>
        ) : null}

        {isMemberAccount ? (
          <section
            id="uye-eposta-bildirimleri"
            className="rounded-2xl border border-orange-200/80 bg-white/90 p-4 shadow-sm sm:p-5"
            aria-label={t.newAdEmailSectionTitle}
          >
            <h2 className="sr-only">{t.newAdEmailSectionTitle}</h2>
            <p className="mb-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
              {dictionary[lang].memberPage.newAdEmailPanelIntro}
            </p>
            <UserPanelNewAdEmailOptIn
              initial={newAdEmailOptIn}
              labels={{
                optInLabel: dictionary[lang].memberPage.newAdEmailOptInLabel,
                optInHelp: dictionary[lang].memberPage.newAdEmailOptInHelp,
                saveHint: t.newAdEmailSaved,
                saving: t.newAdEmailSaving,
                error: t.newAdEmailError,
              }}
            />
          </section>
        ) : null}

        {/* Quick actions — tek sıra; dar görünümde yatay kaydırma */}
        <section
          aria-label="Quick actions"
          className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:overflow-visible sm:pb-0"
        >
          <Link
            href={`/ads/new?lang=${lang}`}
            className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-orange-200/80 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
          >
            <span className="text-2xl" aria-hidden>
              📋
            </span>
            <span className="mt-2 block font-semibold text-orange-950 group-hover:text-orange-900">{t.newAd}</span>
            <span className="mt-1 block text-xs text-slate-600">
              {lang === "tr" ? "İhale veya proje ilanı oluşturun." : "Create a tender or project listing."}
            </span>
          </Link>
          <Link
            href={`/members?lang=${lang}`}
            className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-orange-200/80 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
          >
            <span className="text-2xl" aria-hidden>
              🪪
            </span>
            <span className="mt-2 block font-semibold text-orange-950">{t.profileDocs}</span>
            <span className="mt-1 block text-xs text-slate-600">
              {lang === "tr" ? "Üyelik bilgisi ve yüklenen belgeler." : "Membership details and documents."}
            </span>
          </Link>
          {isMemberAccount ? (
            <Link
              href={lang === "en" ? "/panel/user/is-deneyimi?lang=en" : "/panel/user/is-deneyimi"}
              className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-orange-200/80 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
            >
              <span className="text-2xl" aria-hidden>
                🧱
              </span>
              <span className="mt-2 block font-semibold text-orange-950">{t.workExperience}</span>
              <span className="mt-1 block text-xs text-slate-600">{t.workExperienceDesc}</span>
            </Link>
          ) : null}
          <Link
            href={lang === "en" ? "/muhendis-ara?lang=en" : "/muhendis-ara"}
            className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-orange-200/80 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
          >
            <span className="text-2xl" aria-hidden>
              🔍
            </span>
            <span className="mt-2 block font-semibold text-orange-950">{t.engineerSearch}</span>
            <span className="mt-1 block text-xs text-slate-600">
              {lang === "tr" ? "Meslek sahibi üyeleri keşfedin." : "Browse professional members."}
            </span>
          </Link>
          <Link
            href={lang === "en" ? "/panel/user/topup?lang=en" : "/panel/user/topup"}
            className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-orange-200/80 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
          >
            <span className="text-2xl" aria-hidden>
              💳
            </span>
            <span className="mt-2 block font-semibold text-orange-950">{t.topup}</span>
            <span className="mt-1 block text-xs text-slate-600">
              {lang === "tr" ? "iyzico / PayTR ile kredi." : "Credit via iyzico / PayTR."}
            </span>
          </Link>
          {isMemberAccount ? (
            <Link
              href={lang === "en" ? "/panel/user/sponsorship?lang=en" : "/panel/user/sponsorship"}
              className="admin-nav-card group flex min-h-[118px] min-w-[148px] shrink-0 flex-col rounded-2xl border border-amber-300/90 bg-amber-50/40 p-3 no-underline sm:min-w-0 sm:flex-1 sm:p-4"
            >
              <span className="text-2xl" aria-hidden>
                ✨
              </span>
              <span className="mt-2 block font-semibold text-orange-950">{t.sponsorHero}</span>
              <span className="mt-1 block text-xs text-slate-600">{t.sponsorHeroDesc}</span>
            </Link>
          ) : null}
        </section>

        {/* Period + stats */}
        <section className="glass-card rounded-2xl p-4 sm:p-5">
          <UserPanelDateRange
            lang={lang}
            fromIso={fromIso}
            toIso={toIso}
            usedDefaultRange={usedDefaultRange}
            copy={{
              rangeLabel: t.rangeLabel,
              rangeStart: t.rangeStart,
              rangeEnd: t.rangeEnd,
              rangeReset: t.rangeReset,
              rangeHint: t.rangeHint,
            }}
          />
          <UserDashboardStatTiles
            lang={lang}
            counts={{
              listings: myAds,
              bids: myBids,
              pending: pendingMine,
              payments: paidOrders,
            }}
            listings={statTilesListings}
            bids={statTilesBids}
            pending={statTilesPending}
            payments={statTilesPayments}
            copy={{
              statListings: t.statListings,
              statBids: t.statBids,
              statPending: t.statPending,
              statPayments: t.statPayments,
              clickHint: t.statTileClickHint,
              close: t.statModalClose,
              empty: t.statModalEmpty,
              status: t.status,
              listingPage: t.listingPage,
              amount: t.statAmountLabel,
              date: t.statDateLabel,
              provider: t.statProviderLabel,
            }}
          />
        </section>

        {/* Beğendiğim üyeler (profil beğenisi) */}
        <PanelCollapsibleSection
          sectionId="liked-members"
          title={t.likedMembersTitle}
          description={<p className="text-sm text-slate-600">{t.likedMembersDesc}</p>}
          pinLabel={t.pinSectionKeep}
          unpinLabel={t.pinSectionRelease}
        >
          {likedMemberVotes.length === 0 ? (
            <p className="text-sm text-slate-600">{t.likedMembersEmpty}</p>
          ) : (
            (() => {
              const mid = Math.ceil(likedMemberVotes.length / 2);
              const likedLeft = likedMemberVotes.slice(0, mid);
              const likedRight = likedMemberVotes.slice(mid);
              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <ul className="min-w-0 list-none overflow-hidden rounded-lg border border-orange-100 bg-white/90 divide-y divide-orange-100 p-0 shadow-sm">
                    {likedLeft.map((row) => (
                      <LikedMemberLine
                        key={row.toUser.id}
                        row={row}
                        lang={lang}
                        dateLabel={t.likedMembersDateLabel}
                        memberNoLabel={t.likedMembersMemberNoLabel}
                      />
                    ))}
                  </ul>
                  <ul className="min-w-0 list-none overflow-hidden rounded-lg border border-orange-100 bg-white/90 divide-y divide-orange-100 p-0 shadow-sm">
                    {likedRight.map((row) => (
                      <LikedMemberLine
                        key={row.toUser.id}
                        row={row}
                        lang={lang}
                        dateLabel={t.likedMembersDateLabel}
                        memberNoLabel={t.likedMembersMemberNoLabel}
                      />
                    ))}
                  </ul>
                </div>
              );
            })()
          )}
        </PanelCollapsibleSection>

        {/* My listings */}
        {session && myAdsList.length > 0 ? (
          <section className="glass-card rounded-2xl p-4 sm:p-5">
            <h2 className="text-lg font-bold text-orange-950">{t.myAdsTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.myAdsDesc}</p>
            <div className="mt-4 space-y-3">
              {myAdsList.map((ad) => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-orange-100 bg-white/95 p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>
                      {t.status}: <span className="font-semibold text-orange-900">{ad.status}</span>
                    </span>
                    {ad.status === "APPROVED" ? (
                      <Link
                        className="font-semibold text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-900"
                        href={`/ads/${ad.id}`}
                      >
                        {t.listingPage} →
                      </Link>
                    ) : null}
                  </div>
                  <AdTitleEditor adId={ad.id} initialTitle={ad.title} compact />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Watched */}
        <PanelCollapsibleSection
          sectionId="watched-ads"
          title={t.watchedTitle}
          description={<p className="text-sm text-slate-600">{t.watchedDesc}</p>}
          pinLabel={t.pinSectionKeep}
          unpinLabel={t.pinSectionRelease}
        >
          {watchedAds.length === 0 ? (
            <p className="text-sm text-slate-600">{t.watchedEmpty}</p>
          ) : (
            (() => {
              const mid = Math.ceil(watchedAds.length / 2);
              const watchedLeft = watchedAds.slice(0, mid);
              const watchedRight = watchedAds.slice(mid);
              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <ul className="min-w-0 list-none overflow-hidden rounded-lg border border-orange-100 bg-white/90 divide-y divide-orange-100 p-0 shadow-sm">
                    {watchedLeft.map((row) => (
                      <WatchedAdLine
                        key={row.ad.id}
                        row={row}
                        lang={lang}
                        dateLabel={t.watchedRowDateLabel}
                        listingNoLabel={t.watchedListingNoLabel}
                      />
                    ))}
                  </ul>
                  <ul className="min-w-0 list-none overflow-hidden rounded-lg border border-orange-100 bg-white/90 divide-y divide-orange-100 p-0 shadow-sm">
                    {watchedRight.map((row) => (
                      <WatchedAdLine
                        key={row.ad.id}
                        row={row}
                        lang={lang}
                        dateLabel={t.watchedRowDateLabel}
                        listingNoLabel={t.watchedListingNoLabel}
                      />
                    ))}
                  </ul>
                </div>
              );
            })()
          )}
        </PanelCollapsibleSection>

        <PanelCollapsibleSection
          sectionId="showcase"
          title={t.showcaseTitle}
          description={
            <p className="text-sm text-slate-600">
              {lang === "tr" ? (
                <>
                  Günlük birim fiyat (referans): {settings.showcaseFeeAmountTry} TL — süre seçenekleri: 3 / 5 / 7 / 15 /
                  30 gün
                </>
              ) : (
                <>
                  Daily unit price (reference): {settings.showcaseFeeAmountTry} TRY — duration options: 3 / 5 / 7 / 15 /
                  30 days
                </>
              )}
            </p>
          }
          pinLabel={t.pinSectionKeep}
          unpinLabel={t.pinSectionRelease}
        >
          <UserShowcaseList
            embedded
            initialAds={myAdsList.map((ad) => ({
              ...ad,
              showcaseUntil: ad.showcaseUntil?.toISOString() || null,
            }))}
            showcaseFeeAmountTry={settings.showcaseFeeAmountTry}
            showcaseDailyPricing={(() => {
              try {
                return JSON.parse((settings as { showcaseDailyPricingJson?: string }).showcaseDailyPricingJson || "{}");
              } catch {
                return {};
              }
            })()}
          />
        </PanelCollapsibleSection>

        {isMemberAccount ? (
          <PanelCollapsibleSection
            sectionId="profile-comments"
            title={t.commentsTitle}
            description={<p className="text-sm text-slate-600">{t.commentsDesc}</p>}
            pinLabel={t.pinSectionKeep}
            unpinLabel={t.pinSectionRelease}
          >
            <p className="mt-3 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 px-3 py-2 text-sm">
              <span className="text-slate-600">{t.profileLink}: </span>
              <Link
                className="break-all font-mono font-medium text-orange-800 underline decoration-orange-300 underline-offset-2 hover:text-orange-950"
                href={`/uye/${session.userId}`}
              >
                /uye/{session.userId}
              </Link>
            </p>
            {profileCommentsReceived.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">{t.commentsEmpty}</p>
            ) : (
              <div className="mt-4">
                <MemberPanelCommentReplies
                  comments={profileCommentsReceived.map((c) => ({
                    id: c.id,
                    body: c.body,
                    createdAt: c.createdAt.toISOString(),
                    replyBody: c.replyBody,
                    repliedAt: c.repliedAt?.toISOString() ?? null,
                    fromUser: c.fromUser,
                  }))}
                  lang={lang}
                  feeEnabled={Boolean(settings.memberCommentFeeEnabled)}
                  feeAmount={Number(settings.memberCommentFeeAmountTry ?? 0)}
                  initialBalance={memberBalanceTry}
                />
              </div>
            )}
          </PanelCollapsibleSection>
        ) : null}
      </div>
    </main>
  );
}
