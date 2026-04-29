"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AdAccessAdSummary, type AdAccessSummaryAd } from "@/components/AdAccessAdSummary";

export type AccessPayload = {
  ad: AdAccessSummaryAd & { id: string };
  settings: {
    detailViewFeeEnabled: boolean;
    detailViewFeeAmountTry: number;
    bidAccessFeeEnabled: boolean;
    bidAccessFeeAmountTry: number;
  };
  session: { userId: string; role: string; isOwner: boolean; isAdmin: boolean } | null;
  access: { hasDetailPaid: boolean; hasBidAccessPaid: boolean };
  balance: number;
  bypassPayment: boolean;
};

type AdAccessModalProps = {
  adId: string | null;
  open: boolean;
  onClose: () => void;
  lang: "tr" | "en";
};

function AdAccessModal({ adId, open, onClose, lang }: AdAccessModalProps) {
  const [data, setData] = useState<AccessPayload | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [payErr, setPayErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState<"detail" | "bid" | null>(null);
  /** Hangi ödeme kartı genişletildi (bakiye yükleme alanı) */
  const [paySection, setPaySection] = useState<"detail" | "bid" | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const detailTopupRef = useRef<HTMLDivElement>(null);
  const bidTopupRef = useRef<HTMLDivElement>(null);

  const membersHref =
    lang === "en"
      ? `/members?lang=en#uye-kayit`
      : `/members#uye-kayit`;
  const loginNext = adId ? `/ads/${adId}` : "/";

  /** Aynı /ads/[id] sayfasındayken router.push tetiklenmeyebilir; ödeme sonrası tam yenileme için. */
  const adPageUrl = useCallback(
    (id: string, hash?: string) =>
      `/ads/${id}${lang === "en" ? "?lang=en" : ""}${hash ?? ""}`,
    [lang],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoadErr("");
    setPayErr("");
    setLoading(false);
    setPaying(null);
    setPaySection(null);
    setRefreshKey(0);
  }, []);

  /** Üst bileşen (ör. sanal liste) her kaydırmada yeniden çizerse `onClose` kimliği değişir; ref ile fetch effect'i gereksiz tetiklenmesin. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /** Yalnızca modal açıkken kapandığında sıfırla — kapalıyken her effect çalışmasında reset (liste kaydırırken) ana işi kilitler. */
  const hadModalRef = useRef(false);
  useEffect(() => {
    const active = Boolean(open && adId);
    if (hadModalRef.current && !active) {
      queueMicrotask(reset);
    }
    hadModalRef.current = active;
  }, [open, adId, reset]);

  useEffect(() => {
    if (!open || !adId) {
      return;
    }

    const adIdFixed = adId;
    let cancelled = false;
    const silentRefresh = refreshKey > 0;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!silentRefresh) {
        setLoading(true);
        setLoadErr("");
        setPayErr("");
        setData(null);
      } else {
        setPayErr("");
      }

      void (async () => {
        try {
          const res = await fetch(`/api/ads/${encodeURIComponent(adIdFixed)}/access`, {
            credentials: "same-origin",
            cache: "no-store",
          });
          const text = await res.text();
          let j: Record<string, unknown>;
          try {
            j = JSON.parse(text) as Record<string, unknown>;
          } catch {
            if (!cancelled) {
              const msg =
                lang === "tr"
                  ? `Sunucu yanıtı okunamadı (${res.status}).`
                  : `Could not read server response (${res.status}).`;
              if (!silentRefresh) setLoadErr(msg);
              else setPayErr(msg);
              setLoading(false);
            }
            return;
          }
          if (cancelled) return;

          if (j.bypassPayment) {
            onCloseRef.current();
            window.location.assign(adPageUrl(adIdFixed));
            return;
          }
          if (j.error) {
            const base = typeof j.error === "string" ? j.error : "Error.";
            const detail = typeof j.detail === "string" ? ` (${j.detail})` : "";
            const hint = typeof j.hint === "string" ? ` ${j.hint}` : "";
            if (!silentRefresh) {
              setLoadErr(`${base}${detail}${hint}`);
            } else {
              setPayErr(base);
            }
            setLoading(false);
            return;
          }
          setData(j as AccessPayload);
          setLoading(false);
        } catch {
          if (!cancelled) {
            const msg = lang === "tr" ? "Bağlantı hatası." : "Connection error.";
            if (!silentRefresh) setLoadErr(msg);
            else setPayErr(msg);
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [open, adId, lang, reset, adPageUrl, refreshKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function pay(action: "detail" | "bid") {
    if (!adId) return;
    setPayErr("");
    setPaying(action);
    const res = await fetch(`/api/ads/${encodeURIComponent(adId)}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action }),
    });
    const j = await res.json().catch(() => ({}));
    setPaying(null);
    if (!res.ok) {
      setPayErr(typeof j.error === "string" ? j.error : lang === "tr" ? "Ödeme yapılamadı." : "Payment failed.");
      return;
    }
    onCloseRef.current();
    if (action === "detail") {
      window.location.assign(adPageUrl(adId));
    } else {
      window.location.assign(adPageUrl(adId, "#teklif"));
    }
  }

  if (!open || !adId) return null;

  const t =
    lang === "tr"
      ? {
          title: "İlan erişimi",
          close: "Kapat",
          loading: "Yükleniyor…",
          noFees: "Bu ilan için erişim ücreti tanımlı değil.",
          detailFreeHint: "Detay için ek ücret yok; ilanı doğrudan açabilirsiniz.",
          goDetail: "Detaya git",
          guestTitle: "Devam etmek için üye olun",
          guestText: "Detay görmek veya teklif vermek için onaylı üye kaydı gereklidir.",
          register: "Üye kayıt sayfasına git",
          hasAccount: "Zaten hesabınız var mı?",
          login: "Giriş yapın",
          balance: "Bakiye:",
          detailTitle: "Detay gör",
          detailHint: "İlan açıklaması, konum ve görseller için tek seferlik ücret.",
          bidTitle: "Teklif ver",
          bidHint:
            "Bu ilanda teklif formunu açmak için tek seferlik ücret (ayrıca teklif başına ücret varsa uygulanır).",
          payDetail: "Detay için öde",
          payBid: "Teklif hakkı için öde",
          goDetailBtn: "Detaya git",
          goBidBtn: "Teklif sayfasına git",
          processing: "İşleniyor…",
          currency: "TL",
          topupSectionTitle: "Bakiye yükleme",
          topupSectionHint:
            "Ödeme, kredi bakiyenizden düşer. Yeterseniz aşağıdan kredi yükleyin; işlem sonrası «Bakiyemi güncelledim» ile tutarı yenileyin.",
          required: "Gerekli",
          insufficientBalance: "Bakiyeniz bu tutarı karşılamıyor; önce kredi yükleyin.",
          completePayment: "Bakiyeden öde",
          openTopupPage: "Bakiye yükleme sayfasını aç",
          refreshBalance: "Bakiyemi güncelledim",
          collapsePaySection: "Bakiye alanını kapat",
        }
      : {
          title: "Listing access",
          close: "Close",
          loading: "Loading…",
          noFees: "No access fee is configured for this listing.",
          detailFreeHint: "No detail fee; you can open the listing directly.",
          goDetail: "Open details",
          guestTitle: "Sign up to continue",
          guestText: "Approved member registration is required to view details or place bids.",
          register: "Go to registration",
          hasAccount: "Already have an account?",
          login: "Sign in",
          balance: "Balance:",
          detailTitle: "View details",
          detailHint: "One-time fee for description, location and photos.",
          bidTitle: "Place a bid",
          bidHint: "One-time fee to open the bid form (per-bid fees may also apply).",
          payDetail: "Pay for details",
          payBid: "Pay for bid access",
          goDetailBtn: "Open details",
          goBidBtn: "Go to bidding",
          processing: "Processing…",
          currency: "TRY",
          topupSectionTitle: "Add balance",
          topupSectionHint:
            "Payment is deducted from your credit. If needed, add credit below, then tap «Refresh my balance».",
          required: "Required",
          insufficientBalance: "Your balance is too low; add credit first.",
          completePayment: "Pay from balance",
          openTopupPage: "Open top-up page",
          refreshBalance: "Refresh my balance",
          collapsePaySection: "Close top-up section",
        };

  /** document.body: ana sayfadaki .home-sidebar-panel (overflow + backdrop-filter) fixed içeriği kırpıyordu. */
  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-access-modal-title"
        className="relative z-[101] flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-orange-200/90 bg-[#fff7ed] shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-orange-200/80 px-4 py-3">
          <h2 id="ad-access-modal-title" className="text-lg font-semibold text-slate-900">
            {t.title}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-orange-100/80"
            onClick={() => onCloseRef.current()}
          >
            {t.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && <p className="text-sm text-slate-600">{t.loading}</p>}

          {!loading && loadErr && (
            <div className="space-y-3">
              <p className="text-sm text-red-700">{loadErr}</p>
              <button type="button" className="chip" onClick={() => onCloseRef.current()}>
                {t.close}
              </button>
            </div>
          )}

          {!loading && !loadErr && data && (() => {
            const { ad, settings, session, access, balance } = data;
            const detailOn = settings.detailViewFeeEnabled && settings.detailViewFeeAmountTry > 0;
            const bidOn = settings.bidAccessFeeEnabled && settings.bidAccessFeeAmountTry > 0;

            if (!detailOn && !bidOn) {
              return (
                <div className="space-y-4">
                  <AdAccessAdSummary ad={ad} lang={lang} />
                  <p className="text-xs text-slate-600">{t.noFees}</p>
                  <section className="glass-card space-y-3 rounded-xl border border-orange-200/90 p-4">
                    <h3 className="text-base font-semibold text-orange-950">{t.detailTitle}</h3>
                    <p className="text-sm text-slate-600">{t.detailFreeHint}</p>
                    <Link className="btn-primary inline-block w-full text-center" href={adPageUrl(adId)} onClick={() => onCloseRef.current()}>
                      {t.goDetail}
                    </Link>
                  </section>
                </div>
              );
            }

            if (!session) {
              return (
                <div className="space-y-4">
                  <div>
                    <AdAccessAdSummary ad={ad} lang={lang} />
                    <p className="mt-3 text-sm text-amber-950">{t.guestTitle}</p>
                    <p className="mt-1 text-sm text-slate-600">{t.guestText}</p>
                  </div>
                  <Link className="btn-primary block w-full text-center" href={membersHref} onClick={() => onCloseRef.current()}>
                    {t.register}
                  </Link>
                  <p className="text-center text-sm text-slate-600">
                    {t.hasAccount}{" "}
                    <Link
                      className="font-medium text-orange-800 underline"
                      href={`/login?next=${encodeURIComponent(loginNext)}`}
                    >
                      {t.login}
                    </Link>
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div>
                  <AdAccessAdSummary ad={ad} lang={lang} />
                  <p className="mt-2 text-sm text-slate-700">
                    {t.balance}{" "}
                    <span className="font-semibold tabular-nums">
                      {balance} {t.currency}
                    </span>
                  </p>
                </div>

                {payErr && <p className="text-sm text-red-700">{payErr}</p>}

                <div className="grid gap-3">
                  {!detailOn && (
                    <section className="glass-card space-y-2 rounded-xl border border-slate-200/90 bg-white/60 p-3">
                      <h3 className="font-semibold text-slate-900">{t.detailTitle}</h3>
                      <p className="text-xs text-slate-600">{t.detailFreeHint}</p>
                      <Link
                        className="btn-primary inline-block w-full text-center"
                        href={adPageUrl(adId)}
                        onClick={() => onCloseRef.current()}
                      >
                        {t.goDetailBtn}
                      </Link>
                    </section>
                  )}

                  {detailOn && (
                    <section className="glass-card space-y-2 rounded-xl border border-orange-200 p-3">
                      {access.hasDetailPaid ? (
                        <Link
                          href={adPageUrl(adId)}
                          onClick={() => onCloseRef.current()}
                          className="block text-base font-semibold text-orange-950 underline-offset-2 hover:underline"
                        >
                          {t.detailTitle}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-orange-950">{t.detailTitle}</h3>
                      )}
                      <p className="text-xs text-slate-600">{t.detailHint}</p>
                      <p className="text-sm font-medium text-slate-800">
                        {settings.detailViewFeeAmountTry} {t.currency}
                      </p>
                      {access.hasDetailPaid ? (
                        <Link
                          className="btn-primary inline-block w-full text-center"
                          href={adPageUrl(adId)}
                          onClick={() => onCloseRef.current()}
                        >
                          {t.goDetailBtn}
                        </Link>
                      ) : (
                        <>
                          <button
                            className="btn-primary w-full"
                            type="button"
                            disabled={paying !== null}
                            onClick={() => {
                              if (balance >= settings.detailViewFeeAmountTry) {
                                void pay("detail");
                                return;
                              }
                              setPaySection("detail");
                              queueMicrotask(() =>
                                detailTopupRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                }),
                              );
                            }}
                          >
                            {paying === "detail"
                              ? t.processing
                              : balance >= settings.detailViewFeeAmountTry
                                ? t.completePayment
                                : t.payDetail}
                          </button>
                          {paySection === "detail" && (
                            <div
                              ref={detailTopupRef}
                              id="ad-access-detail-topup"
                              className="mt-3 space-y-3 rounded-lg border border-orange-300/80 bg-orange-50/95 p-3"
                            >
                              <p className="text-xs font-semibold text-orange-950">{t.topupSectionTitle}</p>
                              <p className="text-xs leading-relaxed text-slate-600">{t.topupSectionHint}</p>
                              <div className="text-sm text-slate-800">
                                <span className="text-slate-600">{t.required}:</span>{" "}
                                <span className="font-semibold tabular-nums">
                                  {settings.detailViewFeeAmountTry} {t.currency}
                                </span>
                                <span className="mx-1.5 text-slate-400">·</span>
                                <span className="text-slate-600">{t.balance}</span>{" "}
                                <span className="font-semibold tabular-nums">
                                  {balance} {t.currency}
                                </span>
                              </div>
                              {balance >= settings.detailViewFeeAmountTry ? (
                                <button
                                  className="btn-primary w-full"
                                  type="button"
                                  disabled={paying !== null}
                                  onClick={() => void pay("detail")}
                                >
                                  {paying === "detail" ? t.processing : t.completePayment}
                                </button>
                              ) : (
                                <p className="text-xs text-amber-900">{t.insufficientBalance}</p>
                              )}
                              <Link
                                className="block w-full rounded-[10px] border-2 border-orange-400 bg-white px-3 py-2.5 text-center text-sm font-semibold text-orange-900 hover:bg-orange-100"
                                href={`/panel/user/topup?amount=${settings.detailViewFeeAmountTry}&adId=${encodeURIComponent(adId!)}#bakiye-yukle`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t.openTopupPage}
                              </Link>
                              <button
                                type="button"
                                className="chip w-full border-orange-300 py-2.5 text-orange-900"
                                onClick={() => {
                                  setPayErr("");
                                  setRefreshKey((k) => k + 1);
                                }}
                              >
                                {t.refreshBalance}
                              </button>
                              <button
                                type="button"
                                className="w-full text-center text-xs text-slate-600 underline"
                                onClick={() => setPaySection(null)}
                              >
                                {t.collapsePaySection}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {bidOn && (
                    <section className="glass-card space-y-2 rounded-xl border border-emerald-200 p-3">
                      {access.hasBidAccessPaid ? (
                        <Link
                          href={adPageUrl(adId, "#teklif")}
                          onClick={() => onCloseRef.current()}
                          className="block text-base font-semibold text-emerald-950 underline-offset-2 hover:underline"
                        >
                          {t.bidTitle}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-emerald-950">{t.bidTitle}</h3>
                      )}
                      <p className="text-xs text-slate-600">{t.bidHint}</p>
                      <p className="text-sm font-medium text-slate-800">
                        {settings.bidAccessFeeAmountTry} {t.currency}
                      </p>
                      {access.hasBidAccessPaid ? (
                        <Link
                          className="btn-primary inline-block w-full bg-emerald-600 text-center hover:bg-emerald-700"
                          href={adPageUrl(adId, "#teklif")}
                          onClick={() => onCloseRef.current()}
                        >
                          {t.goBidBtn}
                        </Link>
                      ) : (
                        <>
                          <button
                            className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
                            type="button"
                            disabled={paying !== null}
                            onClick={() => {
                              if (balance >= settings.bidAccessFeeAmountTry) {
                                void pay("bid");
                                return;
                              }
                              setPaySection("bid");
                              queueMicrotask(() =>
                                bidTopupRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                }),
                              );
                            }}
                          >
                            {paying === "bid"
                              ? t.processing
                              : balance >= settings.bidAccessFeeAmountTry
                                ? t.completePayment
                                : t.payBid}
                          </button>
                          {paySection === "bid" && (
                            <div
                              ref={bidTopupRef}
                              id="ad-access-bid-topup"
                              className="mt-3 space-y-3 rounded-lg border border-emerald-300/80 bg-emerald-50/95 p-3"
                            >
                              <p className="text-xs font-semibold text-emerald-950">{t.topupSectionTitle}</p>
                              <p className="text-xs leading-relaxed text-slate-600">{t.topupSectionHint}</p>
                              <div className="text-sm text-slate-800">
                                <span className="text-slate-600">{t.required}:</span>{" "}
                                <span className="font-semibold tabular-nums">
                                  {settings.bidAccessFeeAmountTry} {t.currency}
                                </span>
                                <span className="mx-1.5 text-slate-400">·</span>
                                <span className="text-slate-600">{t.balance}</span>{" "}
                                <span className="font-semibold tabular-nums">
                                  {balance} {t.currency}
                                </span>
                              </div>
                              {balance >= settings.bidAccessFeeAmountTry ? (
                                <button
                                  className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
                                  type="button"
                                  disabled={paying !== null}
                                  onClick={() => void pay("bid")}
                                >
                                  {paying === "bid" ? t.processing : t.completePayment}
                                </button>
                              ) : (
                                <p className="text-xs text-amber-900">{t.insufficientBalance}</p>
                              )}
                              <Link
                                className="block w-full rounded-[10px] border-2 border-emerald-500 bg-white px-3 py-2.5 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                                href={`/panel/user/topup?amount=${settings.bidAccessFeeAmountTry}&adId=${encodeURIComponent(adId!)}#bakiye-yukle`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t.openTopupPage}
                              </Link>
                              <button
                                type="button"
                                className="chip w-full border-emerald-300 py-2.5 text-emerald-900"
                                onClick={() => {
                                  setPayErr("");
                                  setRefreshKey((k) => k + 1);
                                }}
                              >
                                {t.refreshBalance}
                              </button>
                              <button
                                type="button"
                                className="w-full text-center text-xs text-slate-600 underline"
                                onClick={() => setPaySection(null)}
                              >
                                {t.collapsePaySection}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

export default memo(AdAccessModal);
