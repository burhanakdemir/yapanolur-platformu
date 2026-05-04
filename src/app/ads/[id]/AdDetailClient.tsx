"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AdTitleEditor from "@/components/AdTitleEditor";
import AdAccessModal from "@/components/AdAccessModal";
import AdOwnerActions from "@/components/AdOwnerActions";
import { displayAdDescription, displayAdTitle } from "@/lib/adTitleDisplay";
import { getLang } from "@/lib/i18n";
import { isStaffAdminRole } from "@/lib/adminRoles";
import type { Ad } from "./adDetailTypes";
import {
  adDetailQuerySuffix,
  BID_AMOUNT_MAX,
  BID_AMOUNT_MIN,
  bidAmountDigitsFromInput,
  bidAmountDisplayTr,
  formatAdStatusLabel,
  formatDetailDateTime,
} from "./adDetailFormatters";

function AdDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const router = useRouter();
  const lang = getLang(searchParams.get("lang") ?? undefined);
  const [ad, setAd] = useState<Ad | null>(null);
  const [message, setMessage] = useState("");
  const [watched, setWatched] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ userId: string; email: string; role: string } | null>(
    null,
  );
  const [blockedDetail, setBlockedDetail] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bidAmountDigits, setBidAmountDigits] = useState("");
  const [deletingBidId, setDeletingBidId] = useState<string | null>(null);

  async function load() {
    if (!id || typeof id !== "string") return;
    setNotFound(false);
    setLoadError(null);
    const [adRes, watchRes, meRes] = await Promise.all([
      fetch(`/api/ads/${id}/detail`),
      fetch(`/api/ads/${id}/watch`),
      fetch("/api/auth/me"),
    ]);
    const meData = await meRes.json().catch(() => ({ authenticated: false }));
    if (meData.authenticated && meData.user) {
      const u = meData.user as { userId?: string; email: string; role: string };
      setSessionUser({
        userId: typeof u.userId === "string" ? u.userId : "",
        email: u.email,
        role: u.role,
      });
    } else {
      setSessionUser(null);
    }

    const adData = (await adRes.json().catch(() => ({}))) as { error?: string; code?: string };
    if (adRes.status === 401) {
      router.replace(`/members?next=${encodeURIComponent(`/ads/${id}${adDetailQuerySuffix(lang)}`)}`);
      return;
    }
    if (adRes.status === 403 && adData?.code === "DETAIL_PAYMENT_REQUIRED") {
      setBlockedDetail(true);
      setAd(null);
      const watchData = await watchRes.json().catch(() => ({ watched: false }));
      setWatched(Boolean(watchData.watched));
      return;
    }
    if (adRes.status === 404) {
      setBlockedDetail(false);
      setAd(null);
      setNotFound(true);
      const watchData = await watchRes.json().catch(() => ({ watched: false }));
      setWatched(Boolean(watchData.watched));
      return;
    }
    if (!adRes.ok) {
      setBlockedDetail(false);
      setAd(null);
      setLoadError(typeof adData.error === "string" ? adData.error : "Yüklenemedi.");
      const watchData = await watchRes.json().catch(() => ({ watched: false }));
      setWatched(Boolean(watchData.watched));
      return;
    }
    setBlockedDetail(false);
    setAd(adData as Ad);
    const watchData = await watchRes.json().catch(() => ({ watched: false }));
    setWatched(Boolean(watchData.watched));
  }

  useEffect(() => {
    setBlockedDetail(false);
    setAccessModalOpen(false);
    setNotFound(false);
    setLoadError(null);
    setBidAmountDigits("");
    setDeletingBidId(null);
  }, [id]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when listing id changes; lang is UI-only
  }, [id]);

  async function onBid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id || typeof id !== "string") return;
    const formEl = e.currentTarget;
    setMessage("");
    const form = new FormData(formEl);
    const amountTry =
      bidAmountDigits === "" ? NaN : parseInt(bidAmountDigits, 10);
    if (!Number.isFinite(amountTry) || amountTry < BID_AMOUNT_MIN || amountTry > BID_AMOUNT_MAX) {
      setMessage(
        lang === "en"
          ? `Enter an amount between ${BID_AMOUNT_MIN.toLocaleString("en-GB")} and ${BID_AMOUNT_MAX.toLocaleString("en-GB")} TRY.`
          : `Teklif tutarı ${bidAmountDisplayTr(String(BID_AMOUNT_MIN))} – ${bidAmountDisplayTr(String(BID_AMOUNT_MAX))} TL arasında olmalıdır.`,
      );
      return;
    }
    const res = await fetch(`/api/ads/${id}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountTry,
        message: String(form.get("message") || ""),
      }),
    });
    const data = await res.json();
    const errText = Array.isArray(data.error)
      ? data.error.map((i: { message?: string }) => i.message).filter(Boolean).join(" ") || "Doğrulama hatası."
      : typeof data.error === "string"
        ? data.error
        : "Hata.";
    const okMsg = lang === "en" ? "Bid placed." : "Teklif verildi.";
    setMessage(res.ok ? okMsg : errText);
    if (res.ok) {
      formEl.reset();
      setBidAmountDigits("");
      void load();
    }
  }

  async function deleteBid(bidId: string) {
    if (!id || typeof id !== "string") return;
    setMessage("");
    setDeletingBidId(bidId);
    try {
      const res = await fetch(`/api/ads/${encodeURIComponent(id)}/bids/${encodeURIComponent(bidId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(
          typeof data.error === "string"
            ? data.error
            : lang === "en"
              ? "Could not delete bid."
              : "Teklif silinemedi.",
        );
        return;
      }
      setMessage(lang === "en" ? "Bid removed." : "Teklif silindi.");
      void load();
    } finally {
      setDeletingBidId(null);
    }
  }

  async function onToggleWatch() {
    if (!id || typeof id !== "string") return;
    setMessage("");
    const res = await fetch(`/api/ads/${id}/watch`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "İzleme işlemi başarısız.");
      return;
    }
    setWatched(Boolean(data.watched));
  }

  const accessModalVisible = blockedDetail || accessModalOpen;

  const closeAccessModal = useCallback(() => {
    setAccessModalOpen(false);
    setBlockedDetail((bd) => {
      if (bd) {
        router.push(`/?lang=${lang}`);
        return false;
      }
      return bd;
    });
  }, [lang, router]);

  const homeHref = `/?lang=${lang}`;
  const loginNext = `/ads/${id}${adDetailQuerySuffix(lang)}`;

  if (!id || typeof id !== "string") {
    return (
      <main className="p-6 text-slate-600">
        {lang === "en" ? "Invalid listing link." : "Geçersiz ilan bağlantısı."}
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <HomeBackButtonLink href={homeHref}>
          {lang === "en" ? "← Home" : "← Ana Sayfa"}
        </HomeBackButtonLink>
        <p className="text-slate-700">
          {lang === "en" ? "This listing was not found or is not published." : "İlan bulunamadı veya yayında değil."}
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <HomeBackButtonLink href={homeHref}>
          {lang === "en" ? "← Home" : "← Ana Sayfa"}
        </HomeBackButtonLink>
        <p className="text-red-700">{loadError}</p>
      </main>
    );
  }

  if (blockedDetail && !ad && id) {
    return (
      <>
        <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
          <HomeBackButtonLink href={homeHref}>
            {lang === "en" ? "← Home" : "← Ana Sayfa"}
          </HomeBackButtonLink>
          <p className="text-sm leading-relaxed text-slate-700">
            {lang === "tr"
              ? "Bu ilan yayında. Tam açıklama ve fotoğraflar ücretli veya üyelik gerektirebilir; aşağıdaki adımlarla erişimi tamamlayın."
              : "This listing is published. Full description and photos may require membership or a one-time access fee—complete the steps below."}
          </p>
        </main>
        <AdAccessModal adId={id} open={accessModalVisible} onClose={closeAccessModal} lang={lang} />
      </>
    );
  }

  if (!ad) {
    return (
      <main className="p-6 text-slate-600">{lang === "en" ? "Loading…" : "Yükleniyor…"}</main>
    );
  }

  const categoryFallbackVisualUrl =
    (ad.categoryImageUrl ?? ad.category?.imageUrl ?? "").trim() || null;
  const showListingVisuals = (ad.photos?.length ?? 0) > 0 || Boolean(categoryFallbackVisualUrl);
  /** İlan detayında gösterim: en fazla 4 görsel (2×2 grid) */
  const listingPhotosPreview = [...(ad.photos ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <HomeBackButtonLink href={homeHref}>
        {lang === "en" ? "← Home" : "← Ana Sayfa"}
      </HomeBackButtonLink>

      <section className="glass-card rounded-2xl p-5">
        <div className="mb-6 space-y-3">
          <p className="text-sm font-medium text-orange-900/85 tabular-nums">
            {lang === "tr" ? "İlan no:" : "Listing no:"}{" "}
            <span className="font-semibold text-orange-950">{ad.listingNumber}</span>
          </p>
          <div className="w-full rounded-xl border-2 border-orange-600 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 px-4 py-4 shadow-lg shadow-orange-600/35 ring-2 ring-amber-300/50 ring-offset-0 sm:px-5 sm:py-5">
            <h2 className="w-full text-3xl font-bold tracking-tight break-words text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              {displayAdTitle(ad.title)}
            </h2>
            {sessionUser &&
              ((sessionUser.userId && sessionUser.userId === ad.ownerId) ||
                sessionUser.email === ad.owner.email) && (
                <div className="mt-3 border-t border-white/35 pt-3">
                  <AdTitleEditor
                    adId={ad.id}
                    initialTitle={ad.title}
                    onVibrantBackground
                    onSaved={(nextTitle) => setAd((prev) => (prev ? { ...prev, title: nextTitle } : prev))}
                  />
                </div>
              )}
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="w-full rounded-xl border-2 border-orange-400/85 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/40 px-4 py-3 shadow-sm ring-1 ring-orange-200/70 sm:px-5 sm:py-3.5">
            <p className="w-full text-sm leading-snug text-slate-800">
              {displayAdDescription(ad.description)}
            </p>
          </div>

          <div className="pt-0.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-900/70">
              {lang === "tr" ? "İlan sahibi" : "Listing owner"}
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <Link
                href={lang === "en" ? `/uye/${ad.ownerId}?lang=en` : `/uye/${ad.ownerId}`}
                className="group flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-orange-200/90 bg-gradient-to-br from-orange-50 via-amber-50/90 to-white px-3 py-2.5 shadow-sm transition-shadow duration-200 hover:border-orange-400 hover:bg-orange-100/70 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-orange-200 bg-orange-100 sm:h-12 sm:w-12">
                  {ad.owner.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- harici URL
                    <img src={ad.owner.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg text-orange-400 sm:text-xl">
                      👤
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold text-orange-950 group-hover:text-orange-900 sm:text-base">
                    {ad.owner.name?.trim() || ad.owner.email}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-slate-600 sm:text-xs">
                    {lang === "tr" ? "Üye no:" : "Member no:"}{" "}
                    <span className="text-slate-800">{ad.owner.memberNumber}</span>
                  </span>
                </span>
                <span className="shrink-0 text-orange-600 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-700">
                  →
                </span>
              </Link>
              <div className="flex shrink-0 flex-row justify-end gap-2.5 self-end sm:self-auto sm:flex-col sm:justify-center sm:gap-2">
                <div className="min-w-[6.75rem] rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-center shadow-sm sm:min-w-[7.25rem] sm:px-3.5 sm:py-2.5">
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[11px]">
                    {lang === "en" ? "Watching" : "İzlemeye alanlar"}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums leading-none text-orange-950 sm:text-2xl">
                    {ad._count?.watchers ?? 0}
                  </p>
                </div>
                <div className="min-w-[6.75rem] rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-center shadow-sm sm:min-w-[7.25rem] sm:px-3.5 sm:py-2.5">
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[11px]">
                    {lang === "en" ? "Bidders" : "Teklif verenler"}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums leading-none text-orange-950 sm:text-2xl">
                    {typeof ad.bidderCount === "number" ? ad.bidderCount : new Set(ad.bids.map((b) => b.bidder.id)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(ad.status ?? "APPROVED") === "APPROVED" ? (
            <button className="chip w-fit" type="button" onClick={() => void onToggleWatch()}>
              {watched
                ? lang === "en"
                  ? "Remove from watchlist"
                  : "İzlemeyi kaldır"
                : lang === "en"
                  ? "Watch"
                  : "İzlemeye al"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 border-t border-orange-200/60 pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch md:gap-6 lg:gap-8">
            <div className={`flex min-h-0 min-w-0 flex-col ${!showListingVisuals ? "md:col-span-2" : ""}`}>
              <div className="box-border flex min-h-0 w-full flex-1 flex-col rounded-xl border border-orange-200/90 bg-white/70 px-4 py-3.5 shadow-sm ring-1 ring-orange-100/80 sm:px-5 sm:py-4">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-950">
                  {lang === "en" ? "Listing details" : "İlan bilgileri"}
                </h2>
                <dl className="grid w-full min-w-0 gap-x-3 gap-y-2.5 text-sm sm:grid-cols-[minmax(0,9.5rem)_1fr]">
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Category" : "Kategori"}</dt>
                  <dd className="min-w-0 font-semibold text-slate-950">{ad.category?.name ?? "—"}</dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Status" : "Durum"}</dt>
                  <dd className="font-semibold text-slate-950">{formatAdStatusLabel(ad.status, lang)}</dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Starting price" : "Başlangıç fiyatı"}</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {(ad.startingPriceTry ?? 0).toLocaleString(lang === "en" ? "en-GB" : "tr-TR")}{" "}
                    TL
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Auction ends" : "İhale bitişi"}</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {ad.auctionEndsAt ? formatDetailDateTime(ad.auctionEndsAt, lang) : "—"}
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Showcase until" : "Vitrin bitişi"}</dt>
                  <dd className="font-semibold text-slate-950">
                    {ad.showcaseUntil
                      ? formatDetailDateTime(ad.showcaseUntil, lang)
                      : lang === "en"
                        ? "None"
                        : "Yok"}
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Approved at" : "Onay tarihi"}</dt>
                  <dd className="font-semibold text-slate-950">
                    {ad.approvedAt ? formatDetailDateTime(ad.approvedAt, lang) : "—"}
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Created" : "Oluşturulma"}</dt>
                  <dd className="font-semibold text-slate-950">
                    {ad.createdAt ? formatDetailDateTime(ad.createdAt, lang) : "—"}
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Updated" : "Güncellenme"}</dt>
                  <dd className="font-semibold text-slate-950">
                    {ad.updatedAt ? formatDetailDateTime(ad.updatedAt, lang) : "—"}
                  </dd>
                  <dt className="font-bold text-slate-800">{lang === "en" ? "Listing ID" : "Kayıt no (ID)"}</dt>
                  <dd className="break-all font-mono text-xs font-semibold text-slate-800">{ad.id}</dd>
                </dl>
              </div>
            </div>

            {showListingVisuals ? (
              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="box-border flex min-h-0 w-full flex-1 flex-col rounded-xl border border-orange-200/90 bg-white/70 px-4 py-3.5 shadow-sm ring-1 ring-orange-100/80 sm:px-5 sm:py-4">
                  <div className="flex min-h-0 w-full flex-1 flex-col space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-orange-950">
                      {lang === "en" ? "Listing photos" : "İlan görselleri"}
                    </h2>
                    <div className="min-w-0 w-full flex-1">
                      {listingPhotosPreview.length > 0 ? (
                        <div className="grid w-full grid-cols-2 content-start gap-2 sm:min-h-0 sm:gap-2.5">
                          {listingPhotosPreview.map((ph, idx) => {
                            const titleForAlt = displayAdTitle(ad.title);
                            const photoAlt =
                              lang === "en"
                                ? `${titleForAlt} — photo ${idx + 1} of ${listingPhotosPreview.length}`
                                : `${titleForAlt} — görsel ${idx + 1} / ${listingPhotosPreview.length}`;
                            const openLabel =
                              lang === "en"
                                ? `Open photo ${idx + 1} of ${listingPhotosPreview.length} in new tab`
                                : `Görsel ${idx + 1} / ${listingPhotosPreview.length} yeni sekmede aç`;
                            return (
                            <a
                              key={ph.id}
                              href={ph.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={openLabel}
                              className="relative aspect-[4/3] w-full min-h-0 overflow-hidden rounded-lg border-2 border-orange-200/90 bg-white shadow-md transition hover:border-orange-400 hover:shadow-lg"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- blob/harici yükleme URL */}
                              <img src={ph.url} alt={photoAlt} className="h-full w-full object-cover" />
                            </a>
                            );
                          })}
                        </div>
                      ) : categoryFallbackVisualUrl ? (
                        <div className="grid w-full grid-cols-2 gap-2 sm:gap-2.5">
                          <a
                            href={categoryFallbackVisualUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="col-span-2 block aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-orange-200/90 bg-white shadow-md transition hover:border-orange-400 hover:shadow-lg"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- kategori / blob URL */}
                            <img
                              src={categoryFallbackVisualUrl}
                              alt={ad.category?.name ?? ""}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {sessionUser?.role === "MEMBER" && sessionUser.userId === ad.ownerId
        && (ad.status === "PENDING" || ad.status === "APPROVED" || ad.status === undefined) ? (
          <div className="mb-3">
            <Link
              href={lang === "en" ? `/ads/${ad.id}/edit?lang=en` : `/ads/${ad.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-orange-300 bg-white/90 px-4 py-2.5 text-sm font-bold text-orange-950 shadow-sm transition hover:border-orange-500 hover:bg-orange-50"
            >
              {lang === "en" ? "Re-edit listing" : "İlanı yeniden düzenle"}
            </Link>
          </div>
        ) : null}

        {sessionUser?.role === "MEMBER" && sessionUser.userId === ad.ownerId ? (
          <AdOwnerActions
            adId={ad.id}
            lang={lang === "en" ? "en" : "tr"}
            status={ad.status ?? "APPROVED"}
            auctionEndsAt={ad.auctionEndsAt ?? null}
            showcaseUntil={ad.showcaseUntil ?? null}
            onUpdated={() => void load()}
          />
        ) : null}

        <div className="mt-6 border-t border-orange-200/60 pt-3 pb-2">
          <div className="w-full rounded-xl border border-orange-200/60 bg-gradient-to-br from-white/90 to-orange-50/40 p-2.5 shadow-sm">
            <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2">
              <div
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-orange-400/50 bg-gradient-to-b from-orange-200/90 to-orange-100/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-orange-950 shadow-sm ring-1 ring-orange-300/30"
                role="status"
              >
                {lang === "en" ? "Location" : "Konum"}
              </div>
              <div className="flex min-w-[min(100%,14rem)] flex-1 flex-col gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-200/40 sm:min-w-[16rem]">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {lang === "en" ? "Address" : "İl / ilçe / mahalle"}
                </span>
                <span className="text-sm font-semibold leading-snug text-slate-900">
                  {ad.city}, {ad.province} / {ad.district} / {ad.neighborhood}
                </span>
              </div>
              <div className="flex min-w-[10rem] flex-col gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-200/40">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {lang === "en" ? "Block / parcel" : "Ada / parsel"}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {[ad.blockNo, ad.parcelNo].filter(Boolean).join(" / ") || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="teklif" className="glass-card scroll-mt-4 space-y-3 rounded-2xl p-5">
        <h2 className="font-semibold">{lang === "en" ? "Place a bid" : "Teklif Ver"}</h2>
        {(ad.status ?? "APPROVED") !== "APPROVED" ? (
          <p className="text-sm text-slate-600">
            {lang === "en"
              ? "This listing is not accepting bids (pending, cancelled, or completed)."
              : "Bu ilan teklif kabul etmiyor (beklemede, iptal veya sonuçlandı)."}
          </p>
        ) : (
          <>
            {!sessionUser && (
              <p className="text-sm text-slate-600">
                {lang === "en" ? "To bid, " : "Teklif vermek için "}
                <Link
                  className="font-medium text-orange-800 underline"
                  href={lang === "en" ? "/members?lang=en#uye-kayit" : "/members#uye-kayit"}
                >
                  {lang === "en" ? "register" : "üye olun"}
                </Link>
                {lang === "en" ? " or " : " veya "}
                <Link className="font-medium text-orange-800 underline" href={`/login?next=${encodeURIComponent(loginNext)}`}>
                  {lang === "en" ? "sign in" : "giriş yapın"}
                </Link>
                .
              </p>
            )}
            {sessionUser &&
              sessionUser.role !== "MEMBER" &&
              !isStaffAdminRole(sessionUser.role) && (
                <p className="text-sm text-amber-800">
                  {lang === "en"
                    ? "An approved member account is required to bid."
                    : "Teklif vermek için onaylı üye hesabı gerekir."}
                </p>
              )}
            {sessionUser &&
              sessionUser.role === "MEMBER" &&
              ad.ownerId !== sessionUser.userId &&
              ad.viewer &&
              !ad.viewer.canBid &&
              ad.viewer.bidAccessRequired && (
                <p className="text-sm text-amber-900">
                  {lang === "en" ? "To bid you must pay the " : "Teklif verebilmek için "}
                  <button
                    type="button"
                    className="font-medium text-orange-900 underline"
                    onClick={() => setAccessModalOpen(true)}
                  >
                    {lang === "en" ? "bid access fee" : "teklif erişim ücreti"}
                  </button>
                  {lang === "en" ? "." : " ödemeniz gerekir."}
                </p>
              )}
            {sessionUser &&
              sessionUser.userId !== ad.ownerId &&
              (isStaffAdminRole(sessionUser.role) ||
                (sessionUser.role === "MEMBER" && (ad.viewer?.canBid ?? true))) && (
                <form className="space-y-3" onSubmit={onBid}>
                  <p className="text-xs text-slate-600">
                    {lang === "en" ? "Signed in: " : "Giriş: "}
                    <span className="font-medium">{sessionUser.email}</span>
                  </p>
                  <input
                    className="w-full rounded-lg border bg-white p-2 tabular-nums"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    name="amountTry_display"
                    aria-label={lang === "en" ? "Bid amount (TRY)" : "Teklif tutarı (TL)"}
                    placeholder={
                      lang === "en"
                        ? `Min ${BID_AMOUNT_MIN.toLocaleString("en-GB")} TRY`
                        : `Min. ${bidAmountDisplayTr(String(BID_AMOUNT_MIN))} TL`
                    }
                    value={bidAmountDisplayTr(bidAmountDigits ?? "")}
                    onChange={(ev) => setBidAmountDigits(bidAmountDigitsFromInput(ev.target.value))}
                    required
                  />
                  <textarea
                    className="w-full rounded-lg border bg-white p-2"
                    name="message"
                    placeholder={lang === "en" ? "Message (optional)" : "Mesaj (isteğe bağlı)"}
                  />
                  <button className="btn-primary" type="submit">
                    {lang === "en" ? "Submit bid" : "Teklif Gönder"}
                  </button>
                </form>
              )}
          </>
        )}
        {message && <p className="text-sm text-slate-800">{message}</p>}
      </section>

      {ad.viewer?.canViewBidderSummary || ad.bids.length > 0 ? (
        <section className="glass-card space-y-2 rounded-2xl p-5">
          <h2 className="font-semibold">
            {ad.viewer?.canViewBidderSummary
              ? lang === "en"
                ? "Bids"
                : "Teklifler"
              : lang === "en"
                ? ad.bids.length > 1
                  ? "Your bids"
                  : "Your bid"
                : "Teklifiniz"}
          </h2>
          {ad.viewer?.canViewBidderSummary && ad.bids.length === 0 ? (
            <p className="text-sm text-slate-600">
              {lang === "en" ? "No bids yet." : "Henüz teklif yok."}
            </p>
          ) : (
            ad.bids.map((bid) => {
              const isOwnBid =
                sessionUser?.userId &&
                (sessionUser.role === "MEMBER" || isStaffAdminRole(sessionUser.role)) &&
                bid.bidder.id === sessionUser.userId;
              return (
                <div
                  key={bid.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border bg-white p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {bid.bidder.email} - {bid.amountTry.toLocaleString(lang === "en" ? "en-GB" : "tr-TR")}{" "}
                      TL
                    </p>
                    {bid.message && <p className="text-sm text-gray-600">{bid.message}</p>}
                  </div>
                  {isOwnBid ? (
                    <button
                      type="button"
                      disabled={deletingBidId === bid.id}
                      onClick={() => void deleteBid(bid.id)}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingBidId === bid.id
                        ? "…"
                        : lang === "en"
                          ? "Remove bid"
                          : "Teklifi sil"}
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </section>
      ) : null}

      <AdAccessModal
        adId={typeof id === "string" ? id : null}
        open={accessModalVisible}
        onClose={closeAccessModal}
        lang={lang}
      />
    </main>
  );
}

export default function AdDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-slate-600">Yükleniyor…</main>
      }
    >
      <AdDetailInner />
    </Suspense>
  );
}
