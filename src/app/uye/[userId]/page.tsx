import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import MemberVoteSection from "@/components/MemberVoteSection";
import MemberProfileComments from "@/components/MemberProfileComments";
import MemberWorkExperiencePublic from "@/components/MemberWorkExperiencePublic";
import MemberProfileContactButton from "@/components/MemberProfileContactButton";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole, staffViewerRoleLabel } from "@/lib/adminRoles";
import { buildMemberRatingPayload } from "@/lib/memberRatingPayload";
import { viewerProfileFlags, whereMemberProfileVisible } from "@/lib/memberProfileView";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function UyeProfilPage({ params, searchParams }: Props) {
  const { userId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = getLang(langParam);

  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  const { viewerOwnsProfile, viewerIsAdmin } = viewerProfileFlags(
    session ? { userId: session.userId, role: session.role } : null,
    userId,
  );

  const user = await prisma.user.findFirst({
    where: whereMemberProfileVisible(userId, { viewerOwnsProfile, viewerIsAdmin }),
    select: {
      id: true,
      memberNumber: true,
      name: true,
      isMemberApproved: true,
      profilePhotoUrl: true,
      memberProfile: {
        select: {
          phone: true,
          province: true,
          district: true,
          billingAccountType: true,
          billingAuthorizedGivenName: true,
          billingAuthorizedFamilyName: true,
          profession: { select: { name: true } },
        },
      },
      workExperiences: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          province: true,
          district: true,
          blockParcel: true,
          durationYears: true,
          durationMonths: true,
          durationDays: true,
          imageUrl1: true,
          imageUrl2: true,
          imageUrl3: true,
          profession: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!user?.memberProfile) notFound();

  const sessionUserId =
    session && (session.role === "MEMBER" || isStaffAdminRole(session.role))
      ? session.userId
      : null;
  const viewerRole = staffViewerRoleLabel(session?.role);

  const initial = await buildMemberRatingPayload(prisma, userId, sessionUserId, {
    allowUnapprovedTarget: viewerOwnsProfile || viewerIsAdmin,
    viewerRole,
  });
  if (!initial) notFound();

  const authorizedPersonLine =
    user.memberProfile.billingAccountType === "CORPORATE"
      ? [user.memberProfile.billingAuthorizedGivenName, user.memberProfile.billingAuthorizedFamilyName]
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean)
          .join(" ")
      : "";

  const t =
    lang === "tr"
      ? {
          home: "Ana sayfa",
          projectSearch: "Proje ara",
          engineerSearch: "Meslek sahibi ara",
          title: "Üye profili",
          memberNo: "Üye no",
          profession: "Meslek",
          location: "Konum",
          rating: "Puan ve değerlendirme",
          workExperience: "İş deneyimi",
          workDuration: "Bitiş süresi",
          workLocation: "Konum",
          workProfession: "Meslek",
          workCategory: "Kategori",
          contactHint:
            "Telefon ve e-posta için aşağıdaki düğmeye tıklayın; gerekirse tek seferlik kredi ile görüntülenir.",
          authorizedPerson: "Yetkili kişi",
        }
      : {
          home: "Home",
          projectSearch: "Project search",
          engineerSearch: "Find professionals",
          title: "Member profile",
          memberNo: "Member no.",
          profession: "Profession",
          location: "Location",
          rating: "Rating",
          workExperience: "Work experience",
          workDuration: "Duration",
          workLocation: "Location",
          workProfession: "Profession",
          workCategory: "Category",
          contactHint:
            "Tap the button below for phone and email; a one-time credit fee may apply.",
          authorizedPerson: "Authorized contact",
        };

  const qs = new URLSearchParams({ lang }).toString();
  const homeHref = `/?${qs}`;
  const projectSearchHref = `/?${qs}#proje-arama`;
  const muhendisHref = lang === "en" ? "/muhendis-ara?lang=en" : "/muhendis-ara";

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <HomeBackButtonLink href={homeHref}>{t.home}</HomeBackButtonLink>
        {/* Tam sayfa geçiş: #proje-arama kaydırması ve /muhendis-ara yüklemesi istemci yönlendirmesinde güvenilir */}
        <a className="chip inline-flex w-fit text-sm no-underline" href={projectSearchHref}>
          {t.projectSearch}
        </a>
        <a className="chip inline-flex w-fit text-sm no-underline" href={muhendisHref}>
          {t.engineerSearch}
        </a>
      </div>

      {viewerOwnsProfile && !user.isMemberApproved ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {lang === "tr"
            ? "Uyeliginiz henuz onaylanmadi. Bu onizleme yalnizca size ozeldir; diger uyeler profilinizi goremez."
            : "Your membership is pending. This preview is only for you."}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 sm:mx-0">
          {user.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- harici URL
            <img src={user.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl text-orange-300">
              👤
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-orange-950">
            {user.name?.trim() || "—"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t.memberNo}:{" "}
            <span className="font-mono tabular-nums font-semibold text-slate-800">{user.memberNumber}</span>
          </p>
          <p className="mt-2 text-sm text-slate-700">
            <span className="text-slate-500">{t.profession}: </span>
            {user.memberProfile.profession?.name ?? "—"}
          </p>
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">{t.location}: </span>
            {[user.memberProfile.province, user.memberProfile.district].filter(Boolean).join(" · ") || "—"}
          </p>
          {(viewerOwnsProfile || viewerIsAdmin) && authorizedPersonLine ? (
            <p className="mt-3 rounded-lg border border-orange-100 bg-orange-50/90 px-3 py-2 text-sm text-orange-950">
              <span className="font-semibold">{t.authorizedPerson}: </span>
              {authorizedPersonLine}
            </p>
          ) : null}
          {!viewerOwnsProfile ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-600">{t.contactHint}</p>
              <MemberProfileContactButton targetUserId={userId} lang={lang} />
            </div>
          ) : null}
        </div>
      </div>

      <MemberWorkExperiencePublic
        items={user.workExperiences}
        lang={lang}
        copy={{
          sectionTitle: t.workExperience,
          durationLabel: t.workDuration,
          locationLabel: t.workLocation,
          professionLabel: t.workProfession,
          categoryLabel: t.workCategory,
        }}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{t.rating}</h2>
        <MemberVoteSection targetUserId={userId} initial={initial} lang={lang} />
      </section>

      <MemberProfileComments targetUserId={userId} lang={lang} />
    </main>
  );
}
