"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PanelCommentRow = {
  id: string;
  body: string;
  createdAt: string;
  replyBody: string | null;
  repliedAt: string | null;
  fromUser: { memberNumber: number; name: string | null };
};

export default function MemberPanelCommentReplies({
  comments,
  lang,
  feeEnabled,
  feeAmount,
  initialBalance,
}: {
  comments: PanelCommentRow[];
  lang: "tr" | "en";
  feeEnabled: boolean;
  feeAmount: number;
  initialBalance: number;
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [openId, setOpenId] = useState<string | null>(null);
  const [textById, setTextById] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [errById, setErrById] = useState<Record<string, string>>({});
  const [rows, setRows] = useState(comments);

  useEffect(() => {
    setRows(comments);
  }, [comments]);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  const t =
    lang === "tr"
      ? {
          memberNo: "Üye no",
          yourReply: "Yanıtınız",
          replyBtn: "Cevap yaz",
          send: (n: number) => `Gönder (${n} TL düşer)`,
          sending: "Gönderiliyor…",
          feeOff: "Yorum cevabı için Teklif ayarlarında profil yorum ücreti açık ve tutar girilmiş olmalı.",
          insufficient: "Bakiye yetersiz.",
          topup: "Bakiye yükle",
          placeholder: "Cevabınızı yazın…",
          balance: (n: number) => `Bakiye: ${n} TL`,
          cancel: "Vazgeç",
        }
      : {
          memberNo: "Member",
          yourReply: "Your reply",
          replyBtn: "Write reply",
          send: (n: number) => `Send (deducts ${n} TL)`,
          sending: "Sending…",
          feeOff: "Enable the profile comment fee and set an amount in Bid settings to post replies.",
          insufficient: "Insufficient balance.",
          topup: "Add credit",
          placeholder: "Write your reply…",
          balance: (n: number) => `Balance: ${n} TL`,
          cancel: "Cancel",
        };

  const topupHref =
    lang === "en"
      ? `/panel/user/topup?lang=en&amount=${feeAmount}`
      : `/panel/user/topup?amount=${feeAmount}`;

  const canPay = feeEnabled && feeAmount > 0 && balance >= feeAmount;

  async function submit(commentId: string) {
    const trimmed = (textById[commentId] ?? "").trim();
    if (!trimmed) return;
    setSendingId(commentId);
    setErrById((e) => ({ ...e, [commentId]: "" }));
    try {
      const res = await fetch(`/api/members/comments/${encodeURIComponent(commentId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: trimmed }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrById((e) => ({
          ...e,
          [commentId]: typeof j.error === "string" ? j.error : "Hata",
        }));
        return;
      }
      const now = new Date().toISOString();
      setRows((prev) =>
        prev.map((r) =>
          r.id === commentId
            ? {
                ...r,
                replyBody: trimmed,
                repliedAt: j.reply?.repliedAt ?? now,
              }
            : r,
        ),
      );
      setBalance((b) => b - feeAmount);
      setOpenId(null);
      setTextById((m) => ({ ...m, [commentId]: "" }));
      router.refresh();
    } finally {
      setSendingId(null);
    }
  }

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((c) => {
        const hasReply = Boolean(c.replyBody);
        const open = openId === c.id;
        return (
          <li
            key={c.id}
            className="rounded-xl border border-orange-100 bg-white/95 p-4 text-sm text-slate-800 shadow-sm"
          >
            <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
            <p className="mt-3 text-[11px] text-slate-500">
              {t.memberNo} {c.fromUser.memberNumber}
              {c.fromUser.name ? ` · ${c.fromUser.name}` : ""}
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

            {hasReply ? (
              <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/90">
                  {t.yourReply}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{c.replyBody}</p>
                {c.repliedAt ? (
                  <p className="mt-2 text-[11px] text-emerald-800/80">
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
            ) : (
              <div className="mt-4 border-t border-orange-100 pt-3">
                {!feeEnabled || feeAmount <= 0 ? (
                  <p className="text-xs text-amber-900/90">{t.feeOff}</p>
                ) : open ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">{t.balance(balance)}</p>
                    {!canPay ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                        <p>{t.insufficient}</p>
                        <Link className="btn-primary mt-2 inline-block w-full text-center text-xs" href={topupHref}>
                          {t.topup}
                        </Link>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={textById[c.id] ?? ""}
                          onChange={(e) => setTextById((m) => ({ ...m, [c.id]: e.target.value }))}
                          maxLength={800}
                          rows={3}
                          disabled={sendingId === c.id}
                          className="w-full rounded-lg border border-orange-200 bg-white p-2 text-sm text-slate-900 outline-none ring-orange-200 focus:ring-2"
                          placeholder={t.placeholder}
                        />
                        {errById[c.id] ? <p className="text-xs text-red-700">{errById[c.id]}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={sendingId === c.id || !(textById[c.id] ?? "").trim()}
                            className="btn-primary text-sm disabled:opacity-50"
                            onClick={() => void submit(c.id)}
                          >
                            {sendingId === c.id ? t.sending : t.send(feeAmount)}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-medium text-orange-900"
                            onClick={() => {
                              setOpenId(null);
                              setErrById((e) => ({ ...e, [c.id]: "" }));
                            }}
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-950 hover:bg-orange-100"
                    onClick={() => {
                      setOpenId(c.id);
                      setErrById((e) => ({ ...e, [c.id]: "" }));
                    }}
                  >
                    {t.replyBtn}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
