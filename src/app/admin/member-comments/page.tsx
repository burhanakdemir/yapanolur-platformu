"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  fromUser: { id: string; memberNumber: number; name: string | null; email: string };
  toUser: { id: string; memberNumber: number; name: string | null; email: string };
};

function fmt(iso: string) {
  const d = new Date(iso);
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

export default function AdminMemberCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const reload = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    fetch(`/api/admin/member-comments?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { comments?: CommentRow[] }) => setComments(Array.isArray(d.comments) ? d.comments : []));
  }, [q]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function removeComment(id: string) {
    if (!window.confirm("Bu yorumu kalici silmek istiyor musunuz?")) return;
    setDeletingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/member-comments/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Silinemedi.");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-3 md:p-6">
      <Link className="admin-back-link admin-back-link--compact" href="/admin">
        ← Panel
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-orange-950">Uye profil yorumlari</h1>
        <label className="flex max-w-md flex-1 flex-col gap-0.5 text-xs text-slate-600">
          <span className="font-medium">Ara (icerik, ad, e-posta)</span>
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Metin veya uye"
            className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ring-orange-200 focus:ring-2"
            autoComplete="off"
          />
        </label>
      </div>

      {message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{message}</p>
      ) : null}

      <div className="-mx-0.5 overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-orange-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="w-[12%] px-1 py-2 font-semibold">Tarih</th>
              <th className="w-[22%] px-1 py-2 font-semibold">Kimden</th>
              <th className="w-[22%] px-1 py-2 font-semibold">Kime</th>
              <th className="w-[34%] px-1 py-2 font-semibold">Yorum</th>
              <th className="w-[10%] px-1 py-2 text-right font-semibold">Islem</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {comments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                  {q ? "Arama sonucu yok." : "Henuz yorum yok."}
                </td>
              </tr>
            ) : (
              comments.map((c) => (
                <tr key={c.id} className="border-b border-orange-100/80 align-top last:border-0">
                  <td className="p-2 text-slate-600">{fmt(c.createdAt)}</td>
                  <td className="p-2">
                    <span className="font-mono tabular-nums text-orange-900">{c.fromUser.memberNumber}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-medium">{c.fromUser.name || "—"}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{c.fromUser.email}</span>
                  </td>
                  <td className="p-2">
                    <span className="font-mono tabular-nums text-orange-900">{c.toUser.memberNumber}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-medium">{c.toUser.name || "—"}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{c.toUser.email}</span>
                  </td>
                  <td className="p-2">
                    <p className="whitespace-pre-wrap text-slate-800">{c.body}</p>
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                      disabled={deletingId === c.id}
                      onClick={() => void removeComment(c.id)}
                    >
                      {deletingId === c.id ? "…" : "Sil"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Ucret ayarlari: Teklif Ayarlari sayfasindan &quot;Uye profili yorumu&quot; bolumu.
      </p>
    </main>
  );
}
