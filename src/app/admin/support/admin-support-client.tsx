"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ThreadMessage = {
  id: string;
  body: string;
  sender: "VISITOR" | "ADMIN";
  createdAt: string;
};

type Thread = {
  id: string;
  status: string;
  guestEmail: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ThreadMessage[];
};

type ConvRow = {
  id: string;
  status: string;
  guestEmail: string | null;
  province?: string | null;
  user: { email: string; name: string | null; memberNumber: number } | null;
  updatedAt: string;
  unreadForAdmin: number;
  lastMessagePreview: { body: string; at: string; sender: string } | null;
};

const POLL_MS = 4000;
const PRESENCE_MS = 45_000;

export default function AdminSupportClient() {
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [anyOnline, setAnyOnline] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [threadUser, setThreadUser] = useState<ConvRow["user"]>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [presenceAvailable, setPresenceAvailable] = useState(true);
  const [presencePingAt, setPresencePingAt] = useState<string | null>(null);
  const hashInit = useRef(false);

  const fetchList = useCallback(async () => {
    const r = await fetch("/api/admin/support/conversations", { credentials: "include" });
    const data = (await r.json()) as {
      conversations?: ConvRow[];
      anyStaffOnline?: boolean;
      error?: string;
    };
    if (!r.ok) return;
    if (data.conversations) setConversations(data.conversations);
    if (typeof data.anyStaffOnline === "boolean") setAnyOnline(data.anyStaffOnline);
    setLoadingList(false);
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/support/conversations/${id}`, { credentials: "include" });
    const data = (await r.json()) as { thread?: Thread; user?: ConvRow["user"]; error?: string };
    if (!r.ok) return;
    if (data.thread) setThread(data.thread);
    setThreadUser(data.user ?? null);
  }, []);

  useEffect(() => {
    void fetchList();
    const t = setInterval(() => void fetchList(), POLL_MS);
    return () => clearInterval(t);
  }, [fetchList]);

  useEffect(() => {
    if (!activeId) {
      setThread(null);
      setThreadUser(null);
      return;
    }
    void fetchThread(activeId);
    const t = setInterval(() => void fetchThread(activeId), POLL_MS);
    return () => clearInterval(t);
  }, [activeId, fetchThread]);

  useEffect(() => {
    if (hashInit.current) return;
    hashInit.current = true;
    const h = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (h) setActiveId(h);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      setActiveId(h || null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const selectConversation = (id: string) => {
    setActiveId(id);
    window.location.hash = id;
  };

  const pingPresence = useCallback(async () => {
    const r = await fetch("/api/admin/support/presence", {
      method: "POST",
      credentials: "include",
    });
    const j = (await r.json()) as { lastPingAt?: string };
    if (j.lastPingAt) setPresencePingAt(j.lastPingAt);
  }, []);

  useEffect(() => {
    void pingPresence();
  }, [pingPresence]);

  useEffect(() => {
    if (!presenceAvailable) return;
    const t = setInterval(() => void pingPresence(), PRESENCE_MS);
    return () => clearInterval(t);
  }, [presenceAvailable, pingPresence]);

  const setUnavailable = async () => {
    await fetch("/api/admin/support/presence", { method: "DELETE", credentials: "include" });
    setPresenceAvailable(false);
  };

  const setAvailable = async () => {
    setPresenceAvailable(true);
    await pingPresence();
  };

  const onSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/support/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = (await r.json()) as { thread?: Thread; error?: string };
      if (data.thread) setThread(data.thread);
      setReply("");
      void fetchList();
    } finally {
      setSending(false);
    }
  };

  const onCloseThread = async () => {
    if (!activeId) return;
    await fetch(`/api/admin/support/conversations/${activeId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "KAPALI" }),
    });
    setThread((t) => (t ? { ...t, status: "KAPALI" } : null));
    void fetchList();
  };

  const activeSummary = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="chip inline-flex w-fit items-center gap-1 border-orange-300/80 bg-white/90 font-medium text-orange-900 shadow-sm transition hover:border-orange-400 hover:shadow"
          href="/admin"
        >
          ← Yönetici paneli
        </Link>
      </div>

      <header className="glass-card rounded-2xl border border-orange-200/80 p-5 shadow-sm">
        <h1 className="text-xl font-bold text-orange-950 md:text-2xl">Canlı destek</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ziyaretçi ve üye mesajlarını yanıtlayın. Çevrimiçi sayılmak için{" "}
          <strong className="text-slate-800">Müsaitim</strong> açık kalsın; bu sayfa açıkken otomatik
          yenilenir (~45 sn).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              anyOnline ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"
            }`}
          >
            {anyOnline ? "Ekip: en az biri çevrimiçi (son 2 dk)" : "Ekip: çevrimiçi yok (e-posta bildirimi açık)"}
          </span>
          {presenceAvailable ? (
            <button
              type="button"
              className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-900 shadow-sm hover:bg-orange-50"
              onClick={() => void setUnavailable()}
            >
              Müsait değilim
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100"
              onClick={() => void setAvailable()}
            >
              Müsaitim
            </button>
          )}
          {presencePingAt ? (
            <span className="text-xs text-slate-500">Son ping: {new Date(presencePingAt).toLocaleString("tr-TR")}</span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <section className="glass-card max-h-[70vh] overflow-hidden rounded-2xl border border-orange-200/70 shadow-sm">
          <div className="border-b border-orange-200/80 px-3 py-2 text-sm font-semibold text-orange-950">
            Sohbetler
          </div>
          <div className="max-h-[calc(70vh-3rem)] overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-sm text-slate-500">Yükleniyor…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Henüz kayıt yok.</p>
            ) : (
              <ul className="divide-y divide-orange-100">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-orange-50/90 ${
                        activeId === c.id ? "bg-orange-100/80" : ""
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-500">{c.id.slice(0, 8)}…</span>
                        {c.unreadForAdmin > 0 ? (
                          <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {c.unreadForAdmin}
                          </span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-xs text-slate-700">
                        {c.lastMessagePreview?.body ?? "—"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {c.user?.email ?? c.guestEmail ?? "Anonim"} · {c.province ?? "İl yok"} · {c.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] flex-col rounded-2xl border border-orange-200/70 shadow-sm">
          {!activeId ? (
            <p className="m-auto px-6 text-center text-sm text-slate-500">Soldan bir sohbet seçin.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-orange-200/80 px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">{activeId}</p>
                  <p className="text-sm text-slate-800">
                    {threadUser?.email ?? activeSummary?.guestEmail ?? "Anonim ziyaretçi"}
                    {threadUser?.memberNumber != null ? (
                      <span className="ml-2 text-xs text-slate-500">#{threadUser.memberNumber}</span>
                    ) : null}
                  </p>
                </div>
                {thread?.status !== "KAPALI" ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => void onCloseThread()}
                  >
                    Sohbeti kapat
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-500">Kapatıldı</span>
                )}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {thread?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                      m.sender === "VISITOR"
                        ? "ml-0 mr-auto bg-white/90 text-slate-900 ring-1 ring-orange-200/80"
                        : "ml-auto mr-0 bg-orange-600 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${m.sender === "VISITOR" ? "text-slate-400" : "text-orange-100"}`}
                    >
                      {new Date(m.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))}
              </div>
              {thread?.status !== "KAPALI" ? (
                <form onSubmit={(e) => void onSendReply(e)} className="border-t border-orange-200/80 p-3">
                  <label className="sr-only" htmlFor="support-reply">
                    Yanıt
                  </label>
                  <textarea
                    id="support-reply"
                    className="mb-2 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-orange-200 focus:ring-2"
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Yanıt yazın…"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    disabled={sending || !reply.trim()}
                  >
                    {sending ? "Gönderiliyor…" : "Gönder"}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
