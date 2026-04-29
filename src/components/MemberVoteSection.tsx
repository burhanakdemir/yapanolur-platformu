"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MemberStarRating from "@/components/MemberStarRating";
import type { MemberRatingPayload } from "@/lib/memberRatingPayload";

export default function MemberVoteSection({
  targetUserId,
  initial,
  lang = "tr",
}: {
  targetUserId: string;
  initial: MemberRatingPayload;
  lang?: "tr" | "en";
}) {
  const [data, setData] = useState<MemberRatingPayload>(() => ({
    ...initial,
    likers: initial.likers ?? [],
  }));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData({ ...initial, likers: initial.likers ?? [] });
  }, [initial]);

  const t =
    lang === "tr"
      ? {
          like: "Beğen",
          dislike: "Beğenme",
          loginHint: "Oy vermek için giriş yapın (üye hesabı).",
          selfHint: "Kendi profilinize oy veremezsiniz.",
          docs: "Belge ile otomatik",
          likesRule:
            "Her 2 beğeni +0,2 yıldız (en fazla +2). Her 2 beğenmeme −0,2 (en fazla −2).",
          likersTitle: "Beğeni yapan üyeler",
          memberNo: "Üye no",
        }
      : {
          like: "Like",
          dislike: "Dislike",
          loginHint: "Sign in as a member to vote.",
          selfHint: "You cannot vote on your own profile.",
          docs: "From documents",
          likesRule: "Every 2 likes +0.2 stars (max +2). Every 2 dislikes −0.2 (max −2).",
          likersTitle: "Members who liked",
          memberNo: "Member no.",
        };

  const refresh = useCallback(async () => {
    setErr(null);
    const res = await fetch(`/api/members/${encodeURIComponent(targetUserId)}/rating`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      setErr(lang === "tr" ? "Yüklenemedi." : "Could not load.");
      return;
    }
    const j = (await res.json()) as MemberRatingPayload;
    setData({ ...j, likers: j.likers ?? [] });
  }, [targetUserId, lang]);

  const memberProfileHref = (memberUserId: string) =>
    lang === "en" ? `/uye/${memberUserId}?lang=en` : `/uye/${memberUserId}`;

  const formatLikedAt = (iso: string | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  async function postVote(action: "like" | "dislike" | "clear") {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(targetUserId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : lang === "tr" ? "Islem basarisiz." : "Request failed.");
        return;
      }
      if (j.rating) {
        const r = j.rating as MemberRatingPayload;
        setData({ ...r, likers: r.likers ?? [] });
      } else await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-orange-200/90 bg-white/90 p-4 shadow-sm">
      <MemberStarRating score={data.score} />
      <dl className="grid gap-1 text-xs text-slate-600 sm:grid-cols-[10rem_1fr]">
        <dt className="text-slate-500">{t.docs}</dt>
        <dd className="font-medium tabular-nums text-slate-800">
          {Math.min(3, data.docCount)} / 3 {lang === "tr" ? "yıldız" : "stars"} ({data.docCount}{" "}
          {lang === "tr" ? "belge" : "docs"})
        </dd>
        <dt className="text-slate-500">{lang === "tr" ? "Beğeni" : "Likes"}</dt>
        <dd className="tabular-nums font-medium text-slate-800">{data.likeCount}</dd>
        <dt className="text-slate-500">{lang === "tr" ? "Beğenmeme" : "Dislikes"}</dt>
        <dd className="tabular-nums font-medium text-slate-800">{data.dislikeCount}</dd>
      </dl>
      <p className="text-[11px] text-slate-500">{t.likesRule}</p>

      {data.isSelf ? (
        <p className="text-xs text-amber-800">{t.selfHint}</p>
      ) : !data.canVote ? (
        <p className="text-xs text-slate-600">{t.loginHint}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void postVote(data.myVote === "LIKE" ? "clear" : "like")}
            className={`chip min-h-9 px-4 text-sm font-medium transition-colors hover:border-orange-400 hover:bg-orange-50 ${
              data.myVote === "LIKE" ? "!border-orange-500 !bg-orange-200 !text-orange-950" : ""
            }`}
          >
            👍 {t.like}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void postVote(data.myVote === "DISLIKE" ? "clear" : "dislike")}
            className={`chip min-h-9 px-4 text-sm font-medium ${
              data.myVote === "DISLIKE" ? "!border-slate-500 !bg-slate-200 !text-slate-900" : ""
            }`}
          >
            👎 {t.dislike}
          </button>
          {loading ? (
            <span className="text-xs text-slate-500">…</span>
          ) : null}
        </div>
      )}
      {err ? <p className="text-xs text-red-700">{err}</p> : null}

      {(data.likers ?? []).length > 0 ? (
        <div className="border-t border-orange-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-600">{t.likersTitle}</p>
          <ul className="w-fit max-w-full overflow-hidden rounded-lg border border-orange-100 bg-orange-50/50">
            {(data.likers ?? []).map((u) => (
              <li key={u.id} className="px-2 py-0 leading-tight first:pt-1 last:pb-1">
                <p className="text-[11px] leading-snug text-slate-500">
                  {u.name?.trim() ? (
                    <>
                      {t.memberNo} {u.memberNumber}
                      {" · "}
                      <Link
                        href={memberProfileHref(u.id)}
                        className="font-medium text-orange-800 underline-offset-2 hover:underline"
                      >
                        {u.name.trim()}
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={memberProfileHref(u.id)}
                      className="font-medium text-orange-800 underline-offset-2 hover:underline"
                    >
                      {t.memberNo} {u.memberNumber}
                    </Link>
                  )}
                  {u.likedAt ? (
                    <span className="text-slate-400">
                      {" "}
                      ·{" "}
                      {formatLikedAt(u.likedAt)}
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
