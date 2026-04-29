"use client";

import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ThreadMessage = {
  id: string;
  body: string;
  sender: "VISITOR" | "ADMIN";
  createdAt: string;
};

type Thread = {
  id: string;
  status: string;
  userId: string | null;
  guestEmail: string | null;
  messages: ThreadMessage[];
};

const POLL_MS = 4000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && t.length <= 320 && EMAIL_RE.test(t);
}

function SupportTabIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 9.5h.01M12 9.5h.01M16 9.5h.01M7 19v-2.5H5a2 2 0 01-2-2V6.5a2 2 0 012-2h14a2 2 0 012 2V11a2 2 0 01-2 2h-6.5L7 19z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SupportFloatingWidgetProps = {
  /** viewport: sabit sağ-alt (layout); footer: üst bileşen absolute ile konumlar */
  anchor?: "viewport" | "footer";
};

export default function SupportFloatingWidget({ anchor = "viewport" }: SupportFloatingWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [input, setInput] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Üye oturumu: e-posta istemez; diğer tüm oturumlar anonim sohbet için e-posta zorunlu */
  const [meState, setMeState] = useState<"loading" | "guest" | "member">("loading");
  const bottomRef = useRef<HTMLDivElement>(null);

  const hidden = pathname === "/admin" || pathname?.startsWith("/admin/");

  /** Üye oturumu veya sunucuda userId bağlı sohbet: e-posta yok */
  const showGuestEmailField = meState !== "member" && !thread?.userId;

  const refresh = useCallback(async () => {
    const r = await fetch("/api/support/thread", { credentials: "include", cache: "no-store" });
    const data = (await r.json()) as { thread?: Thread | null; error?: string };
    if (!r.ok) return;
    if (data.thread) setThread(data.thread);
    else if (!data.thread) setThread(null);
  }, []);

  useEffect(() => {
    if (!open || hidden) return;
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [open, hidden, refresh]);

  useEffect(() => {
    if (!open || hidden) {
      setMeState("loading");
      return;
    }
    let cancelled = false;
    setMeState("loading");
    void (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled) return;
      if (!r.ok) {
        setMeState("guest");
        return;
      }
      const data = (await r.json()) as { user?: { role?: string } };
      setMeState(data.user?.role === "MEMBER" ? "member" : "guest");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hidden]);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, thread?.messages.length]);

  const startNewConversation = async () => {
    setError("");
    if (showGuestEmailField && !isValidEmail(guestEmail)) {
      setError("Yeni görüşme için geçerli bir e-posta girin.");
      return;
    }
    const r = await fetch("/api/support/thread", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "Yeni görüşme başlatıldı.",
        forceNew: true,
        ...(showGuestEmailField ? { guestEmail: guestEmail.trim() } : {}),
      }),
    });
    const data = (await r.json()) as { thread?: Thread; error?: string };
    if (!r.ok) {
      setError(typeof data.error === "string" ? data.error : "Yeni görüşme açılamadı.");
      return;
    }
    if (data.thread) setThread(data.thread);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (showGuestEmailField && !isValidEmail(guestEmail)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/support/thread", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          ...(showGuestEmailField ? { guestEmail: guestEmail.trim() } : {}),
        }),
      });
      const data = (await r.json()) as { thread?: Thread; error?: string };
      if (!r.ok) {
        setError(typeof data.error === "string" ? data.error : "Gönderilemedi.");
        return;
      }
      if (data.thread) setThread(data.thread);
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  const rootClass =
    anchor === "footer"
      ? "pointer-events-none relative z-50 flex flex-col items-end"
      : "pointer-events-none fixed bottom-0 right-0 z-[60] flex flex-col items-end p-3 sm:p-4";

  return (
    <div className={rootClass}>
      {open ? (
        <div
          className="pointer-events-auto mb-2 flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-orange-300/80 bg-white/95 shadow-2xl shadow-orange-900/15 backdrop-blur-sm"
          role="dialog"
          aria-label="Canlı destek"
        >
          <div className="flex items-center justify-between border-b border-orange-200/90 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-2">
            <span className="text-sm font-semibold text-orange-950">Canlı destek</span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-medium text-orange-900 hover:bg-white/80"
              onClick={() => setOpen(false)}
            >
              Kapat
            </button>
          </div>
          <div className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto px-3 py-2">
            {!thread?.messages.length ? (
              <p className="text-xs text-slate-600">
                Merhaba. Sorunuzu yazın; yöneticilerimiz yanıtlar.
                {showGuestEmailField ? (
                  <>
                    {" "}
                    <strong className="text-slate-800">Ziyaretçiler için e-posta zorunludur.</strong>
                  </>
                ) : null}
              </p>
            ) : null}
            {thread?.messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-sm ${
                  m.sender === "VISITOR"
                    ? "ml-0 mr-auto bg-orange-50 text-slate-900 ring-1 ring-orange-200/70"
                    : "ml-auto mr-0 bg-orange-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {!thread || thread.status !== "KAPALI" ? (
            <form onSubmit={(e) => void onSubmit(e)} className="border-t border-orange-200/80 p-3">
              {showGuestEmailField ? (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-700">
                    E-posta <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="ornek@eposta.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    autoComplete="email"
                    required={meState === "guest"}
                    disabled={meState === "loading"}
                  />
                </label>
              ) : null}
              <textarea
                className="mb-2 w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-300"
                rows={2}
                placeholder="Mesajınız…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              {error ? <p className="mb-1 text-xs text-red-600">{error}</p> : null}
              <button
                type="submit"
                className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50"
                disabled={
                  loading ||
                  meState === "loading" ||
                  !input.trim() ||
                  (showGuestEmailField && !isValidEmail(guestEmail))
                }
              >
                {loading ? "Gönderiliyor…" : "Gönder"}
              </button>
            </form>
          ) : (
            <div className="border-t border-orange-200/80 p-3 text-center">
              <p className="text-xs text-slate-500">Bu görüşme kapatıldı.</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-orange-700 underline hover:text-orange-900"
                onClick={() => void startNewConversation()}
              >
                Yeni görüşme başlat
              </button>
            </div>
          )}
        </div>
      ) : null}
      <button
        type="button"
        className="home-post-listing-cta-glow btn-primary pointer-events-auto inline-flex h-7 max-w-[calc(100vw-1.5rem)] shrink-0 items-center gap-1.5 rounded-full !border-0 !py-0 !pl-2 !pr-2.5 text-[11px] font-semibold !text-white shadow-md transition hover:opacity-95 active:scale-[0.98] sm:h-8 sm:gap-2 sm:!py-0.5 sm:!pl-2.5 sm:!pr-3.5 sm:text-xs"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Canlı desteği kapat" : "Canlı destek"}
      >
        {open ? (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm leading-none text-white sm:h-6 sm:w-6">
              ×
            </span>
            <span className="truncate">Kapat</span>
          </>
        ) : (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 sm:h-6 sm:w-6">
              <SupportTabIcon className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
            </span>
            <span className="truncate">Canlı destek</span>
          </>
        )}
      </button>
    </div>
  );
}
