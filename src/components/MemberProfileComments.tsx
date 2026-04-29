"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  replyBody: string | null;
  repliedAt: string | null;
  fromUser: { id: string; memberNumber: number; name: string | null };
};

type CommentInfo = {
  feeEnabled: boolean;
  feeAmount: number;
  balance: number;
  isSelf: boolean;
  needsLogin: boolean;
  canPost: boolean;
};

export default function MemberProfileComments({
  targetUserId,
  lang = "tr",
}: {
  targetUserId: string;
  lang?: "tr" | "en";
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [info, setInfo] = useState<CommentInfo | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const t =
    lang === "tr"
      ? {
          title: "Yorumlar",
          empty: "Henüz yorum yok.",
          profileReply: "Profil sahibi yanıtı",
          memberNo: "Üye no",
          placeholder: "Yorumunuzu yazın…",
          send: "Gönder",
          sendWithFee: (n: number) => `Gönder (${n} TL düşer)`,
          login: "Yorum yazmak için giriş yapın.",
          loginBtn: "Giriş",
          self: "Kendi profilinize yorum yazılamaz.",
          feeOffModal:
            "Yorum yazabilmek için yönetici panelinden (Teklif ayarları) profil yorum ücretinin açılması ve tutar girilmesi gerekir.",
          openComment: "Yorum yap",
          modalTitle: "Yorum — ödeme ve gönderim",
          fee: (n: number) => `Yorum başına ücret: ${n} TL (gönderimde bakiyeden düşülür)`,
          balance: (n: number) => `Mevcut bakiye: ${n} TL`,
          insufficient:
            "Yorum yazmak için bakiyeniz yetersiz. Kredi yükledikten sonra tekrar deneyin.",
          topup: "Bakiye yükle",
          close: "Kapat",
        }
      : {
          title: "Comments",
          empty: "No comments yet.",
          profileReply: "Profile owner reply",
          memberNo: "Member no.",
          placeholder: "Write a comment…",
          send: "Send",
          sendWithFee: (n: number) => `Send (deducts ${n} TL)`,
          login: "Sign in to comment.",
          loginBtn: "Sign in",
          self: "You cannot comment on your own profile.",
          feeOffModal:
            "An administrator must enable the profile comment fee and set an amount in site settings before comments can be posted.",
          openComment: "Write a comment",
          modalTitle: "Comment — payment and submit",
          fee: (n: number) => `Fee per comment: ${n} TL (deducted on send)`,
          balance: (n: number) => `Your balance: ${n} TL`,
          insufficient: "Insufficient balance. Add credits and try again.",
          topup: "Add credit",
          close: "Close",
        };

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [cRes, iRes] = await Promise.all([
        fetch(`/api/members/${encodeURIComponent(targetUserId)}/comments`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch(`/api/members/${encodeURIComponent(targetUserId)}/comment-info`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);
      const cJson = await cRes.json();
      const iJson = await iRes.json();
      if (cRes.ok && Array.isArray(cJson.comments)) {
        setComments(
          cJson.comments.map((row: CommentRow) => ({
            ...row,
            replyBody: row.replyBody ?? null,
            repliedAt: row.repliedAt ?? null,
          })),
        );
      }
      if (iRes.ok) setInfo(iJson as CommentInfo);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    void load();
  }, [modalOpen, load]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(targetUserId)}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: trimmed }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Hata");
        return;
      }
      setText("");
      setModalOpen(false);
      if (j.comment) {
        setComments((prev) => [
          {
            id: j.comment.id,
            body: j.comment.body,
            createdAt:
              typeof j.comment.createdAt === "string"
                ? j.comment.createdAt
                : new Date(j.comment.createdAt).toISOString(),
            replyBody: null,
            repliedAt: null,
            fromUser: j.comment.fromUser,
          },
          ...prev,
        ]);
      }
      const iRes = await fetch(`/api/members/${encodeURIComponent(targetUserId)}/comment-info`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const iJson = await iRes.json();
      if (iRes.ok) setInfo(iJson as CommentInfo);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const loginHref =
    lang === "en"
      ? `/login?lang=en&next=${encodeURIComponent(`/uye/${targetUserId}?lang=en`)}`
      : `/login?next=${encodeURIComponent(`/uye/${targetUserId}`)}`;

  const topupHref =
    lang === "en"
      ? `/panel/user/topup?lang=en&amount=${info?.feeAmount ?? 0}`
      : `/panel/user/topup?amount=${info?.feeAmount ?? 0}`;

  const memberProfileHref = (memberUserId: string) =>
    lang === "en" ? `/uye/${memberUserId}?lang=en` : `/uye/${memberUserId}`;

  const showCommentCTA = info && !info.needsLogin && !info.isSelf;

  return (
    <section className="space-y-3 rounded-xl border border-orange-200/90 bg-white/90 p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{t.title}</h2>

      {info?.needsLogin ? (
        <p className="text-xs text-slate-600">
          {t.login}{" "}
          <Link className="font-medium text-orange-800 underline" href={loginHref}>
            {t.loginBtn}
          </Link>
        </p>
      ) : null}

      {info?.isSelf ? <p className="text-xs text-amber-800">{t.self}</p> : null}

      {showCommentCTA ? (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setModalOpen(true);
          }}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-orange-200 bg-white px-5 text-sm font-semibold text-orange-950 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          {t.openComment}
        </button>
      ) : null}

      {modalOpen && info && showCommentCTA ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-comment-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t.close}
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-orange-200 bg-[#fff7ed] p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <h3 id="member-comment-modal-title" className="text-lg font-bold text-orange-950">
                {t.modalTitle}
              </h3>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-orange-100"
                onClick={() => setModalOpen(false)}
              >
                {t.close}
              </button>
            </div>

            {!info.feeEnabled || info.feeAmount <= 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-700">{t.feeOffModal}</p>
            ) : (
              <>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>{t.fee(info.feeAmount)}</p>
                  <p className="font-medium text-slate-900">{t.balance(info.balance)}</p>
                </div>

                {!info.canPost ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-sm text-amber-950">
                    <p>{t.insufficient}</p>
                    <Link className="btn-primary inline-block w-full text-center text-sm" href={topupHref}>
                      {t.topup}
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={800}
                      rows={4}
                      disabled={sending}
                      className="w-full rounded-lg border border-orange-200 bg-white p-3 text-sm text-slate-900 outline-none ring-orange-200 focus:ring-2"
                      placeholder={t.placeholder}
                    />
                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      className="btn-primary min-h-10 w-full disabled:opacity-50"
                    >
                      {sending ? "…" : t.sendWithFee(info.feeAmount)}
                    </button>
                  </form>
                )}
              </>
            )}

            {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-xs text-slate-500">…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-orange-100 bg-orange-50/50 p-3 text-sm">
              <p className="whitespace-pre-wrap text-slate-800">{c.body}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                {c.fromUser.name ? (
                  <>
                    {t.memberNo} {c.fromUser.memberNumber}
                    {" · "}
                    <Link
                      href={memberProfileHref(c.fromUser.id)}
                      className="font-medium text-orange-800 underline-offset-2 hover:underline"
                    >
                      {c.fromUser.name}
                    </Link>
                  </>
                ) : (
                  <Link
                    href={memberProfileHref(c.fromUser.id)}
                    className="font-medium text-orange-800 underline-offset-2 hover:underline"
                  >
                    {t.memberNo} {c.fromUser.memberNumber}
                  </Link>
                )}
                <span className="text-slate-400">
                  {" "}
                  ·{" "}
                  {new Date(c.createdAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              {c.replyBody ? (
                <div className="mt-3 rounded-md border border-emerald-200/70 bg-emerald-50/70 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/85">
                    {t.profileReply}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.replyBody}</p>
                  {c.repliedAt ? (
                    <p className="mt-1.5 text-[10px] text-emerald-800/75">
                      {new Date(c.repliedAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
