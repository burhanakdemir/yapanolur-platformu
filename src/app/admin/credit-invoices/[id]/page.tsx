import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { getCreditInvoiceRequestDelegate, warnCreditInvoiceDelegateMissing } from "@/lib/prismaCreditInvoice";
import CreditInvoiceActions from "./credit-invoice-actions";

type PageProps = { params: Promise<{ id: string }> };

const billingTypeLabel: Record<string, string> = {
  INDIVIDUAL: "Bireysel",
  CORPORATE: "Kurumsal",
};

export default async function AdminCreditInvoiceDetailPage({ params }: PageProps) {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  const inv = getCreditInvoiceRequestDelegate();
  if (!inv) {
    warnCreditInvoiceDelegateMissing();
    return (
      <main className="px-4 pb-12 pt-2 md:px-6">
        <Link
          href="/admin/credit-invoices"
          className="mb-3 inline-block text-sm font-medium text-orange-800 underline-offset-2 hover:underline"
        >
          ← Fatura listesi
        </Link>
        <div className="glass-card rounded-2xl p-5 text-sm text-amber-950 shadow-lg">
          <p className="font-semibold">Fatura modülü hazır değil</p>
          <p className="mt-2">
            Prisma istemcisi veya veritabanı migration’ı güncel değil. Proje klasöründe{" "}
            <code className="rounded bg-white px-1">npx prisma generate</code> ve{" "}
            <code className="rounded bg-white px-1">npx prisma migrate dev</code> çalıştırıp geliştirme sunucusunu
            yeniden başlatın.
          </p>
        </div>
      </main>
    );
  }

  const row = await inv.findUnique({
    where: { id },
    include: {
      paymentOrder: { select: { id: true, provider: true, status: true, paidAt: true, amountTry: true } },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          memberNumber: true,
          memberProfile: {
            select: {
              billingAccountType: true,
              billingTcKimlik: true,
              billingCompanyTitle: true,
              billingTaxOffice: true,
              billingVkn: true,
              billingAddressLine: true,
              billingPostalCode: true,
              province: true,
              district: true,
              phone: true,
            },
          },
        },
      },
      approvedBy: { select: { email: true, name: true } },
    },
  });

  if (!row) notFound();

  const mp = row.user.memberProfile;
  const canIssue = row.status === "PENDING_APPROVAL" || row.status === "FAILED";

  return (
    <main className="px-4 pb-12 pt-2 md:px-6">
      <Link
        href="/admin/credit-invoices"
        className="mb-3 inline-block text-sm font-medium text-orange-800 underline-offset-2 hover:underline"
      >
        ← Fatura listesi
      </Link>

      <div className="glass-card rounded-2xl p-5 shadow-lg md:p-6">
        <div className="flex flex-col gap-2 border-b border-orange-200/80 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-bold text-orange-950">Fatura kesimi</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ödeme: <span className="font-mono text-xs">{row.paymentOrderId}</span> · {row.paymentOrder.provider} ·{" "}
              <span className="tabular-nums">{row.amountTry} ₺</span>
            </p>
          </div>
          <div className="text-right text-sm">
            <span
              className={
                row.status === "PENDING_APPROVAL"
                  ? "rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
                  : row.status === "ISSUED"
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900"
                    : "rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-900"
              }
            >
              {row.status === "PENDING_APPROVAL"
                ? "Onay bekliyor"
                : row.status === "ISSUED"
                  ? "Kesildi"
                  : "Hata"}
            </span>
            {row.issuedAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Kesim: {new Date(row.issuedAt).toLocaleString("tr-TR")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-orange-100 bg-white/85 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-orange-900/75">Üye</h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-800">
              <div>
                <dt className="text-xs text-slate-500">Ad / e-posta</dt>
                <dd>
                  {row.user.name || "—"} · {row.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Üye no</dt>
                <dd className="tabular-nums">#{row.user.memberNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Profil</dt>
                <dd>
                  <Link href={`/admin/members`} className="text-orange-800 underline-offset-2 hover:underline">
                    Üye listesinden açın
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-orange-100 bg-white/85 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-orange-900/75">Fatura bilgileri</h2>
            {mp ? (
              <dl className="mt-2 space-y-1 text-sm text-slate-800">
                <div>
                  <dt className="text-xs text-slate-500">Hesap tipi</dt>
                  <dd>{billingTypeLabel[mp.billingAccountType] ?? mp.billingAccountType}</dd>
                </div>
                {mp.billingAccountType === "INDIVIDUAL" ? (
                  <div>
                    <dt className="text-xs text-slate-500">T.C. Kimlik No</dt>
                    <dd className="font-mono">{mp.billingTcKimlik || "—"}</dd>
                  </div>
                ) : (
                  <>
                    <div>
                      <dt className="text-xs text-slate-500">Ünvan</dt>
                      <dd>{mp.billingCompanyTitle || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">VKN</dt>
                      <dd className="font-mono">{mp.billingVkn || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Vergi dairesi</dt>
                      <dd>{mp.billingTaxOffice || "—"}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="text-xs text-slate-500">Adres</dt>
                  <dd>{mp.billingAddressLine || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Posta kodu</dt>
                  <dd>{mp.billingPostalCode || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">İl / ilçe (profil)</dt>
                  <dd>
                    {mp.province || "—"} / {mp.district || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Telefon</dt>
                  <dd>{mp.phone || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-amber-800">Üye profili yok — fatura alanları kayıtta bulunmuyor.</p>
            )}
          </section>
        </div>

        {row.status === "ISSUED" ? (
          <section className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Kesim sonucu</h2>
            <dl className="mt-2 space-y-1 text-emerald-950">
              <div>
                <dt className="text-xs text-emerald-800/90">ETTN / UUID</dt>
                <dd className="font-mono text-xs break-all">{row.ettn || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800/90">Belge no (entegratör)</dt>
                <dd className="font-mono text-xs break-all">{row.providerDocumentId || "—"}</dd>
              </div>
              {row.documentUrl ? (
                <div>
                  <dt className="text-xs text-emerald-800/90">PDF / bağlantı</dt>
                  <dd>
                    <a href={row.documentUrl} className="break-all underline" target="_blank" rel="noreferrer">
                      {row.documentUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
              {row.approvedBy ? (
                <p className="text-xs text-emerald-800/80">
                  Onaylayan: {row.approvedBy.name || row.approvedBy.email}
                </p>
              ) : null}
            </dl>
          </section>
        ) : null}

        {row.status === "FAILED" && row.lastError ? (
          <section className="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-950">
            <h2 className="text-xs font-bold uppercase tracking-wide text-rose-900">Son hata</h2>
            <p className="mt-2 whitespace-pre-wrap break-words">{row.lastError}</p>
          </section>
        ) : null}

        <CreditInvoiceActions invoiceId={row.id} canIssue={canIssue} initialNote={row.adminNote} />
      </div>
    </main>
  );
}
