"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";

type MemberDoc = { id: string; type: string; fileUrl: string };

type MemberRow = {
  id: string;
  memberNumber: number;
  email: string;
  name: string | null;
  password: string;
  isMemberApproved: boolean;
  memberProfile: {
    phone: string | null;
    province: string | null;
    district: string | null;
    profession: { name: string } | null;
    documentCount: number;
  } | null;
};

const PAGE_SIZE = 80;

/** Islem sutunundaki chip ile aynı cizgi / kutu hissi */
const MEM_CELL =
  "box-border flex min-h-8 w-full min-w-0 items-center rounded-lg border border-orange-200 bg-white px-1.5 py-1 text-[11px] shadow-sm";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);
  const [totalFiltered, setTotalFiltered] = useState<number | null>(null);
  const [skip, setSkip] = useState(0);
  const [docCache, setDocCache] = useState<Record<string, MemberDoc[] | undefined>>({});
  const [loadingDocsId, setLoadingDocsId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [openDocsId, setOpenDocsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ userId: string; label: string } | null>(null);
  const [pendingCredit, setPendingCredit] = useState<{ userId: string; label: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setSkip(0);
  }, [searchQ]);

  const reloadMembers = useCallback(() => {
    const params = new URLSearchParams({
      status: "all",
      take: String(PAGE_SIZE),
      skip: String(skip),
    });
    if (searchQ) params.set("q", searchQ);
    fetch(`/api/admin/members?${params.toString()}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        setOpenDocsId(null);
        setDocCache({});
        if (Array.isArray(data)) {
          setMembers(data as MemberRow[]);
          setTotalMemberCount(null);
          setTotalFiltered(null);
          return;
        }
        if (data && typeof data === "object" && "members" in data && Array.isArray((data as { members: unknown }).members)) {
          const d = data as {
            members: MemberRow[];
            totalMemberCount?: number;
            totalFiltered?: number;
          };
          setMembers(d.members);
          setTotalMemberCount(typeof d.totalMemberCount === "number" ? d.totalMemberCount : null);
          setTotalFiltered(typeof d.totalFiltered === "number" ? d.totalFiltered : null);
          return;
        }
        setMembers([]);
        setTotalMemberCount(null);
        setTotalFiltered(null);
      });
  }, [searchQ, skip]);

  useEffect(() => {
    reloadMembers();
  }, [reloadMembers]);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete]);

  async function setMemberApproval(userId: string, action: "approve" | "pending") {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Uye durumu guncellendi." : data.error || "Hata.");
    if (!res.ok) return;
    reloadMembers();
  }

  function openDeleteDialog(userId: string, label: string) {
    setPendingDelete({ userId, label });
  }

  function closeDeleteDialog() {
    setPendingDelete(null);
  }

  async function performDelete(userId: string) {
    setDeletingId(userId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Uye silinemedi.");
        return;
      }
      setOpenDocsId((id) => (id === userId ? null : id));
      setMessage("Uye silindi.");
      closeDeleteDialog();
      reloadMembers();
    } finally {
      setDeletingId(null);
    }
  }

  function openCreditDialog(userId: string, label: string) {
    setCreditAmount("");
    setPendingCredit({ userId, label });
  }

  function closeCreditDialog() {
    setPendingCredit(null);
    setCreditAmount("");
  }

  async function performCreditLoad() {
    if (!pendingCredit) return;
    const n = Number.parseInt(creditAmount, 10);
    if (!Number.isFinite(n) || n < 1) {
      setMessage("1 veya daha buyuk tam sayi girin.");
      return;
    }
    setCreditLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${pendingCredit.userId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountTry: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Yukleme basarisiz.");
        return;
      }
      setMessage(`Bakiye yuklendi: ${n} TL (ADJUSTMENT)`);
      closeCreditDialog();
    } finally {
      setCreditLoading(false);
    }
  }

  async function resetMemberPassword(userId: string) {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPassword" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Sifre sifirlama hatasi.");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, password: data.temporaryPassword || m.password } : m)),
    );
    setMessage(`Yeni sifre: ${data.temporaryPassword} | Mail: ${data.emailSent ? "Gonderildi" : "Gonderilemedi"}`);
  }

  async function handleBelgelerClick(userId: string, documentCount: number) {
    if (openDocsId === userId) {
      setOpenDocsId(null);
      return;
    }
    setOpenDocsId(userId);
    if (documentCount <= 0) {
      setDocCache((c) => ({ ...c, [userId]: [] }));
      return;
    }
    if (docCache[userId] !== undefined) return;

    setLoadingDocsId(userId);
    try {
      const r = await fetch(`/api/admin/members/${userId}`);
      const data = (await r.json()) as { documents?: MemberDoc[] };
      setDocCache((c) => ({
        ...c,
        [userId]: Array.isArray(data.documents) ? data.documents : [],
      }));
    } finally {
      setLoadingDocsId(null);
    }
  }

  const hasActiveFilters = Boolean(searchQ);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-3 p-3 md:p-6">
      <Link className="admin-back-link admin-back-link--compact" href={adminUrl()}>
        ← Panel
      </Link>

      <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-bold tracking-tight">
              <span>Uyelik Yonetimi</span>
              {totalMemberCount !== null ? (
                <span className="text-base font-semibold tabular-nums text-orange-800">
                  (Toplam üye: {totalMemberCount})
                </span>
              ) : null}
            </h1>
            <label className="flex max-w-md flex-1 flex-col gap-0.5 text-xs text-slate-600">
              <span className="font-medium">Ara (ad soyad veya e-posta)</span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ornek: ahmet veya @gmail"
                className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none ring-orange-200 focus:ring-2"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="-mx-0.5 overflow-x-auto">
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-orange-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="w-[4%] px-1 py-2 text-center align-middle font-semibold">Üye no</th>
              <th className="w-[11%] px-1 py-2 text-center align-middle font-semibold">Ad</th>
              <th className="w-[14%] px-1 py-2 text-center align-middle font-semibold">E-posta</th>
              <th className="w-[13%] px-1 py-2 text-center align-middle font-semibold">Tel</th>
              <th className="w-[10%] px-1 py-2 text-center align-middle font-semibold">Il / Ilce</th>
              <th className="w-[8%] px-1 py-2 text-center align-middle font-semibold">Meslek</th>
              <th className="w-[7%] px-1 py-2 text-center align-middle font-semibold">Durum</th>
              <th className="w-[10%] px-1 py-2 text-center align-middle font-semibold">Sifre</th>
              <th className="w-[8%] px-1 py-2 text-center align-middle font-semibold">Belgeler</th>
              <th className="w-[15%] px-1 py-2 text-center align-middle text-[9px] font-semibold leading-tight">
                Islem
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {members.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-4 text-center text-xs text-slate-500">
                  {hasActiveFilters ? "Arama sonucu yok." : "Uye kaydi yok."}
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const docCount = m.memberProfile?.documentCount ?? 0;
                const docs = docCache[m.id];
                const expanded = openDocsId === m.id;
                const docsLoading = loadingDocsId === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr className="border-b border-orange-100/80 align-top last:border-0">
                      <td className="p-0.5 align-middle">
                        <div
                          className={`${MEM_CELL} justify-center px-0.5 text-center font-mono text-[10px] tabular-nums text-orange-900`}
                        >
                          {m.memberNumber}
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} items-center justify-center`}>
                          <Link
                            href={adminUrl(`/members/${m.id}`)}
                            className="line-clamp-2 w-full min-w-0 rounded-md px-1.5 py-0.5 text-center font-medium text-orange-950 transition-colors hover:bg-orange-400 hover:text-white"
                          >
                            {m.name || "—"}
                          </Link>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} min-w-0 justify-center text-center`}>
                          <span
                            className="min-w-0 max-w-full truncate text-orange-900/90"
                            title={m.email}
                          >
                            {m.email}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div
                          className={`${MEM_CELL} min-w-0 justify-center text-center font-mono text-[11px] tabular-nums tracking-tight text-slate-700`}
                        >
                          <span
                            className="min-w-0 max-w-full truncate"
                            title={m.memberProfile?.phone || undefined}
                          >
                            {m.memberProfile?.phone || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div
                          className={`${MEM_CELL} justify-center text-center text-slate-600`}
                          title={
                            [m.memberProfile?.province, m.memberProfile?.district].filter(Boolean).join(" / ") || ""
                          }
                        >
                          <span className="line-clamp-2 w-full text-center text-[10px] leading-tight">
                            {[m.memberProfile?.province, m.memberProfile?.district].filter(Boolean).join(" / ") ||
                              "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} justify-center text-center text-slate-600`}>
                          <span
                            className="line-clamp-2 w-full text-center text-[10px] leading-tight"
                            title={m.memberProfile?.profession?.name || ""}
                          >
                            {m.memberProfile?.profession?.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} justify-center`}>
                          <span
                            className={
                              m.isMemberApproved ? "font-medium text-emerald-800" : "font-medium text-amber-800"
                            }
                          >
                            {m.isMemberApproved ? "Onayli" : "Bekliyor"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} justify-center text-center font-mono text-[10px] text-slate-500`}>
                          <span className="line-clamp-1 w-full max-w-full text-center" title={m.password}>
                            {m.password.length > 12 ? `${m.password.slice(0, 12)}…` : m.password}
                          </span>
                        </div>
                      </td>
                      <td className="p-0.5 align-middle">
                        <div className={`${MEM_CELL} justify-center`}>
                          <button
                            type="button"
                            className="line-clamp-2 w-full text-center text-[10px] font-medium text-orange-900 hover:underline"
                            onClick={() => void handleBelgelerClick(m.id, docCount)}
                            aria-expanded={expanded}
                          >
                            Belgeler
                            {docCount > 0 ? ` (${docCount})` : ""}
                          </button>
                        </div>
                      </td>
                      <td className="p-0.5 pl-0.5 pr-1 align-middle">
                        <div
                          className={`${MEM_CELL} !flex min-h-8 !items-center !justify-center !px-1 !py-1`}
                        >
                          <div className="grid w-full grid-cols-2 gap-1">
                            <button
                              className="chip flex min-h-[1.75rem] w-full items-center justify-center !px-0.5 !py-1 text-[9px] leading-tight"
                              type="button"
                              onClick={() => void resetMemberPassword(m.id)}
                            >
                              Sıfırla
                            </button>
                            <button
                              className="chip flex min-h-[1.75rem] w-full items-center justify-center !px-0.5 !py-1 text-[9px] leading-tight"
                              type="button"
                              onClick={() => void setMemberApproval(m.id, m.isMemberApproved ? "pending" : "approve")}
                            >
                              {m.isMemberApproved ? "Bekle" : "Onayla"}
                            </button>
                            <button
                              className="chip flex min-h-[1.75rem] w-full items-center justify-center !px-0.5 !py-1 text-[9px] leading-tight"
                              type="button"
                              title="Kredi bakiyesine TL yukle"
                              onClick={() => openCreditDialog(m.id, m.name?.trim() || m.email)}
                            >
                              Bakiye
                            </button>
                            <button
                              className="flex min-h-[1.75rem] w-full items-center justify-center rounded border border-red-200 bg-red-50 px-0.5 py-1 text-[9px] leading-tight text-red-900 hover:bg-red-100 disabled:opacity-50"
                              type="button"
                              disabled={deletingId === m.id}
                              title="Uye hesabini kalici sil"
                              onClick={() => openDeleteDialog(m.id, m.name?.trim() || m.email)}
                            >
                              {deletingId === m.id ? "…" : "Sil"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-orange-100/80 bg-orange-100/30">
                        <td colSpan={10} className="p-1.5">
                          <div className="rounded-lg border border-orange-200 bg-white px-3 py-2 shadow-sm">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Belgeler
                          </p>
                          {docsLoading ? (
                            <p className="text-xs text-slate-500">Yukleniyor…</p>
                          ) : docs === undefined ? (
                            <p className="text-xs text-slate-500">—</p>
                          ) : docs.length === 0 ? (
                            <p className="text-xs text-slate-500">Belge yok.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {docs.map((doc) => (
                                <Link
                                  key={doc.id}
                                  className="chip py-0.5 px-2 text-[11px]"
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {doc.type}
                                </Link>
                              ))}
                            </div>
                          )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

          {totalFiltered !== null && totalFiltered > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-100 bg-orange-50/50 px-2 py-1.5 text-[11px] text-slate-600">
              <span className="tabular-nums">
                {skip + 1}–{skip + members.length} / {totalFiltered}
                {totalFiltered > PAGE_SIZE ? " (sayfa)" : ""}
              </span>
              {totalFiltered > PAGE_SIZE ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="chip px-2 py-0.5 text-[10px] disabled:opacity-40"
                    disabled={skip === 0}
                    onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
                  >
                    Onceki
                  </button>
                  <button
                    type="button"
                    className="chip px-2 py-0.5 text-[10px] disabled:opacity-40"
                    disabled={skip + members.length >= totalFiltered}
                    onClick={() => setSkip((s) => s + PAGE_SIZE)}
                  >
                    Sonraki
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="text-xs text-slate-700">{message}</p> : null}
      </div>

      {pendingCredit ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-dialog-title"
          onClick={closeCreditDialog}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-orange-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="credit-dialog-title" className="text-sm font-semibold text-slate-900">
              Bakiye yukle
            </h2>
            <p className="mt-2 text-xs text-slate-600">{pendingCredit.label}</p>
            <label className="mt-3 block text-xs font-medium text-slate-600">
              Tutar (TL)
              <input
                type="number"
                min={1}
                step={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 text-slate-900"
                autoFocus
              />
            </label>
            <p className="mt-2 text-[11px] text-slate-500">
              Kullanici bakiyesine ADJUSTMENT olarak eklenir (iptal edilemez; dikkatli kullanin).
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                onClick={closeCreditDialog}
              >
                Iptal
              </button>
              <button
                type="button"
                className="rounded-lg border border-orange-400 bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={creditLoading}
                onClick={() => void performCreditLoad()}
              >
                {creditLoading ? "…" : "Yukle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-member-dialog-title"
          onClick={closeDeleteDialog}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-orange-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-member-dialog-title" className="text-sm font-semibold text-slate-900">
              Emin misiniz?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Bu islem geri alinamaz: ilanlar, teklifler ve belgeler dahil bu uyeye ait tum bagli veriler
              silinir.
            </p>
            <p className="mt-2 rounded-lg bg-orange-50 px-2 py-1.5 text-xs font-medium text-orange-950">
              {pendingDelete.label}
            </p>
            <p className="mt-4 text-xs text-slate-600">
              Silmeyi onaylamak icin <strong className="text-slate-900">Evet</strong>, iptal etmek icin{" "}
              <strong className="text-slate-900">Hayır</strong> dugmesine basin.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-orange-50"
                onClick={closeDeleteDialog}
              >
                Hayır
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                disabled={deletingId === pendingDelete.userId}
                onClick={() => void performDelete(pendingDelete.userId)}
              >
                {deletingId === pendingDelete.userId ? "Siliniyor…" : "Evet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
