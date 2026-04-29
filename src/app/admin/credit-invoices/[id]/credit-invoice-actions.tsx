"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  invoiceId: string;
  canIssue: boolean;
  initialNote: string | null;
};

export default function CreditInvoiceActions({ invoiceId, canIssue, initialNote }: Props) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("");

  if (!canIssue) {
    return initialNote ? (
      <div className="mt-5 rounded-xl border border-orange-200/80 bg-white/90 p-4 text-sm text-slate-800">
        <p className="text-xs font-semibold text-orange-900/90">Yönetici notu</p>
        <p className="mt-2 whitespace-pre-wrap">{initialNote}</p>
      </div>
    ) : null;
  }

  async function saveNote() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/credit-invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: note.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "Not kaydedilemedi.");
        return;
      }
      setMessage("Not kaydedildi.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function issue() {
    setIssuing(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/credit-invoices/${invoiceId}/issue`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setMessage(data.error || "Kesim basarisiz.");
        router.refresh();
        return;
      }
      setMessage("Fatura kesildi (veya mock onaylandi).");
      router.refresh();
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-orange-200/80 bg-white/90 p-4">
      <label className="block text-xs font-semibold text-orange-900/90">
        Yönetici notu (düzeltme / iç not — gereksiz kişisel veri yazmayın)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/35"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={saving}
          className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-950 shadow-sm transition hover:bg-orange-50 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor…" : "Notu kaydet"}
        </button>
        <button
          type="button"
          onClick={() => void issue()}
          disabled={issuing}
          className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
        >
          {issuing ? "Gonderiliyor…" : "Fatura onayı / kesime gönder"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
