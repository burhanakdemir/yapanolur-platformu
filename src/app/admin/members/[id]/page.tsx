import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { adminUrl } from "@/lib/adminUrls";
import { prisma } from "@/lib/prisma";

function fmt(iso: Date | string | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasFullAdminAccess())) {
    redirect(`${adminUrl()}?next=${encodeURIComponent(adminUrl(`/members/${id}`))}`);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      memberNumber: true,
      email: true,
      name: true,
      profilePhotoUrl: true,
      isMemberApproved: true,
      createdAt: true,
      updatedAt: true,
      role: true,
      memberProfile: {
        select: {
          phone: true,
          province: true,
          district: true,
          profession: { select: { name: true } },
          billingAccountType: true,
          billingTcKimlik: true,
          billingCompanyTitle: true,
          billingTaxOffice: true,
          billingVkn: true,
          billingAddressLine: true,
          billingPostalCode: true,
          documents: {
            select: { id: true, type: true, fileUrl: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user || user.role !== "MEMBER") notFound();

  const docs = user.memberProfile?.documents ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link text-xs" href={adminUrl("/members")}>
        ← Uye listesi
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {user.name?.trim() || "Adsiz uye"}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Uye no:{" "}
          <span className="font-mono tabular-nums font-medium text-slate-700">{user.memberNumber}</span>
          <span className="text-slate-400"> · </span>
          <span className="text-slate-400">ID: </span>
          <code className="rounded bg-white/80 px-1 text-[10px]">{user.id}</code>
        </p>
      </div>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Uyelik</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">E-posta</dt>
          <dd>
            <a href={`mailto:${user.email}`} className="text-orange-900 underline">
              {user.email}
            </a>
          </dd>
          <dt className="text-slate-500">Durum</dt>
          <dd className={user.isMemberApproved ? "font-medium text-emerald-800" : "font-medium text-amber-800"}>
            {user.isMemberApproved ? "Onayli" : "Bekliyor"}
          </dd>
          <dt className="text-slate-500">Kayit</dt>
          <dd>{fmt(user.createdAt)}</dd>
          <dt className="text-slate-500">Son guncelleme</dt>
          <dd>{fmt(user.updatedAt)}</dd>
        </dl>
      </section>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Profil</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Telefon</dt>
          <dd className="font-mono tabular-nums">{user.memberProfile?.phone ?? "—"}</dd>
          <dt className="text-slate-500">Il / ilce</dt>
          <dd>
            {[user.memberProfile?.province, user.memberProfile?.district].filter(Boolean).join(" / ") || "—"}
          </dd>
          <dt className="text-slate-500">Meslek</dt>
          <dd>{user.memberProfile?.profession?.name ?? "—"}</dd>
        </dl>
      </section>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fatura bilgileri</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Tip</dt>
          <dd>
            {user.memberProfile?.billingAccountType === "CORPORATE"
              ? "Kurumsal"
              : user.memberProfile?.billingAccountType === "INDIVIDUAL"
                ? "Bireysel"
                : "—"}
          </dd>
          {user.memberProfile?.billingAccountType === "INDIVIDUAL" && (
            <>
              <dt className="text-slate-500">TC Kimlik</dt>
              <dd className="font-mono tabular-nums">{user.memberProfile?.billingTcKimlik ?? "—"}</dd>
            </>
          )}
          {user.memberProfile?.billingAccountType === "CORPORATE" && (
            <>
              <dt className="text-slate-500">Ticari ünvan</dt>
              <dd className="break-words">{user.memberProfile?.billingCompanyTitle ?? "—"}</dd>
              <dt className="text-slate-500">Vergi dairesi</dt>
              <dd>{user.memberProfile?.billingTaxOffice ?? "—"}</dd>
              <dt className="text-slate-500">VKN</dt>
              <dd className="font-mono tabular-nums">{user.memberProfile?.billingVkn ?? "—"}</dd>
            </>
          )}
          <dt className="text-slate-500">Fatura adresi</dt>
          <dd className="break-words">{user.memberProfile?.billingAddressLine ?? "—"}</dd>
          <dt className="text-slate-500">Posta kodu</dt>
          <dd className="tabular-nums">{user.memberProfile?.billingPostalCode ?? "—"}</dd>
        </dl>
      </section>

      {user.profilePhotoUrl ? (
        <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Profil fotografi</h2>
          <a
            href={user.profilePhotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block overflow-hidden rounded-lg border border-orange-200 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- harici yukleme URL */}
            <img src={user.profilePhotoUrl} alt="" className="max-h-48 max-w-full object-contain" />
          </a>
        </section>
      ) : null}

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Belgeler</h2>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-500">Belge yok.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                className="chip py-0.5 px-2 text-[11px]"
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {doc.type}
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-slate-500">
        Onay, sifre sifirlama ve silme islemleri icin{" "}
        <Link href={adminUrl("/members")} className="text-orange-900 underline">
          uye listesine
        </Link>{" "}
        donun.
      </p>
    </main>
  );
}
