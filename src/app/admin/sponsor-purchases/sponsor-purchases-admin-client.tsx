"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type Row = {
  id: string;
  periodDays: number;
  amountTryPaid: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    memberNumber: number;
    memberProfile: {
      province: string | null;
      profession: { name: string } | null;
    } | null;
  };
};

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return { error: `Sunucu boş yanıt (${res.status})` };
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: "Geçersiz JSON yanıtı." };
  }
}

export default function SponsorPurchasesAdminClient({ initialRows = [] }: { initialRows?: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMsg("");
    const res = await fetch("/api/admin/sponsor-purchases", { credentials: "include" });
    const data = await readApiJson(res);
    if (!res.ok) {
      setMsg(apiErrorMessage(data.error, "Liste alınamadı."));
      return;
    }
    const requests = data.requests;
    setRows(Array.isArray(requests) ? (requests as Row[]) : []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function resolve(id: string, action: "approve" | "reject", amountTryPaid: number) {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/sponsor-purchases/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        setMsg(apiErrorMessage(data.error, "İşlem yapılamadı."));
        return;
      }
      if (action === "approve") {
        setMsg("Onaylandı; ana sayfa TR şeridinde sponsor satırı oluşturuldu.");
      } else {
        setMsg(
          amountTryPaid > 0
            ? "Reddedildi; tahsil edilen tutar üyenin bakiyesine iade edildi."
            : "Reddedildi (ücretsiz başvuru; iade yok).",
        );
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-slate-600">Yükleniyor…</p> : null}
      {msg ? (
        <p className="rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2 text-sm text-slate-800">{msg}</p>
      ) : null}

      {rows.length === 0 && !loading && !msg ? (
        <p className="text-sm text-slate-600">Bekleyen sponsorluk başvurusu yok.</p>
      ) : null}

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[52rem] table-fixed border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-orange-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2 text-left font-semibold">Üye</th>
              <th className="w-[6rem] py-2 text-center font-semibold">Üye no</th>
              <th className="w-[6rem] py-2 text-center font-semibold">Gün</th>
              <th className="w-[7rem] py-2 text-center font-semibold">Ödenen ₺</th>
              <th className="w-[10rem] py-2 text-center font-semibold">İşlem</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {rows.map((r) => {
              const subtitle = [r.user.memberProfile?.profession?.name, r.user.memberProfile?.province]
                .filter(Boolean)
                .join(" · ");
              const busy = busyId === r.id;
              return (
                <tr key={r.id} className="border-b border-orange-100/90 align-top">
                  <td className="py-2 pr-2">
                    <span className="font-semibold text-orange-950">{r.user.name || r.user.email}</span>
                    {r.user.name ? <span className="block truncate text-[10px] text-slate-500">{r.user.email}</span> : null}
                    {subtitle ? <span className="block truncate text-[10px] text-slate-600">{subtitle}</span> : null}
                  </td>
                  <td className="py-2 text-center tabular-nums font-medium">{r.user.memberNumber}</td>
                  <td className="py-2 text-center tabular-nums">{r.periodDays}</td>
                  <td className="py-2 text-center tabular-nums font-medium">{r.amountTryPaid.toLocaleString("tr-TR")}</td>
                  <td className="py-2 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                        onClick={() => void resolve(r.id, "approve", r.amountTryPaid)}
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-red-300 bg-white px-2 py-1 text-[10px] font-bold text-red-800 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => void resolve(r.id, "reject", r.amountTryPaid)}
                      >
                        Reddet
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-600">
        <Link href="/admin/members" className="font-semibold text-orange-800 underline-offset-2 hover:underline">
          Üye listesi
        </Link>{" "}
        ve{" "}
        <Link href="/admin/listings" className="font-semibold text-orange-800 underline-offset-2 hover:underline">
          İlan onayı
        </Link>{" "}
        sayfalarından sonra bekleyen ödemeli başvurular burada işlenir. Reddetmek üyenin bakiyesine ücreti iade eder.
      </p>
    </div>
  );
}
