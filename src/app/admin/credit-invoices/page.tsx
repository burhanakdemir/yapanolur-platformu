import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { getCreditInvoiceRequestDelegate, warnCreditInvoiceDelegateMissing } from "@/lib/prismaCreditInvoice";

const statusLabel: Record<string, string> = {
  PENDING_APPROVAL: "Onay bekliyor",
  ISSUED: "Kesildi",
  FAILED: "Hata",
};

export default async function AdminCreditInvoicesPage() {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    redirect("/admin");
  }

  const inv = getCreditInvoiceRequestDelegate();
  if (!inv) {
    warnCreditInvoiceDelegateMissing();
  }
  const items =
    (await inv?.findMany({
      take: 80,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true, memberNumber: true } },
      },
    })) ?? [];

  return (
    <main className="px-4 pb-12 pt-2 md:px-6">
      <div className="glass-card rounded-2xl p-5 shadow-lg md:p-6">
        <h1 className="text-lg font-bold text-orange-950">Kredi faturası (e-fatura / e-arşiv)</h1>
        <p className="mt-1 text-sm text-orange-900/85">
          Ödeme onayı sonrası oluşan kayıtlar. Sovos modu ve API bilgileri yalnızca{" "}
          <strong>süper yönetici</strong> tarafından <strong>Ödeme sağlayıcıları</strong> sayfasından (veya isteğe bağlı{" "}
          <code className="rounded bg-orange-50 px-1 text-xs">.env</code> yedeğiyle) tanımlanır; bu sayfada yalnızca fatura
          onayı verilir.
        </p>
        {!inv ? (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Veritabanı şeması veya Prisma istemcisi güncel değil. Proje kökünde{" "}
            <code className="rounded bg-white px-1">npx prisma generate</code> ve{" "}
            <code className="rounded bg-white px-1">npx prisma migrate dev</code> çalıştırın; geliştirme sunucusunu
            yeniden başlatın.
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">Bekleyen veya geçmiş kayıt yok.</p>
        ) : (
          <ul className="mt-5 divide-y divide-orange-100/90 rounded-xl border border-orange-200/80 bg-white/80">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/credit-invoices/${row.id}`}
                  className="flex flex-col gap-1 px-3 py-3 text-sm transition hover:bg-orange-50/80 md:flex-row md:items-center md:justify-between"
                >
                  <span className="font-medium text-orange-950">
                    {row.user.name || row.user.email}{" "}
                    <span className="font-normal text-slate-500">#{row.user.memberNumber}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="tabular-nums">{row.amountTry} ₺</span>
                    <span
                      className={
                        row.status === "PENDING_APPROVAL"
                          ? "rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"
                          : row.status === "ISSUED"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900"
                            : "rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-900"
                      }
                    >
                      {statusLabel[row.status] ?? row.status}
                    </span>
                    <span className="text-slate-400">
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
