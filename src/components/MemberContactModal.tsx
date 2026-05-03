"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ContactAccessPayload = {
  target?: {
    id: string;
    memberNumber: number;
    name: string | null;
    profilePhotoUrl: string | null;
    professionName: string | null;
  };
  settings: {
    memberContactFeeEnabled: boolean;
    memberContactFeeAmountTry: number;
  };
  session: { userId: string; role: string } | null;
  balance: number;
  access: { hasPaid: boolean; requiresPayment: boolean };
  bypassPayment?: boolean;
  /** Bu üyenin onaylı ilanına teklif verildiği için iletişim ücreti alınmaz */
  freeListingBidderAccess?: boolean;
  contact: {
    email: string;
    phone: string | null;
    province: string | null;
    district: string | null;
    /** Kurumsal üye: ücretli iletişimde yetkili ad soyad */
    authorizedPersonName: string | null;
  } | null;
  pendingApproval?: boolean;
  error?: string;
};

type Props = {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  lang: "tr" | "en";
  /** Giriş sonrası yönlendirme (`next`). Belirtilmezse mühendis ara sayfası kullanılır. */
  loginNextPath?: string;
};

export default function MemberContactModal({ userId, open, onClose, lang, loginNextPath }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ContactAccessPayload | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [payErr, setPayErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reset = useCallback(() => {
    setData(null);
    setLoadErr("");
    setPayErr("");
    setLoading(false);
    setPaying(false);
    setRefreshKey(0);
  }, []);

  useEffect(() => {
    if (!open || !userId) {
      queueMicrotask(reset);
      return;
    }

    let cancelled = false;
    const id = userId;
    queueMicrotask(() => {
      setLoading(true);
      setLoadErr("");
      setPayErr("");
      setData(null);
    });

    void (async () => {
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(id)}/contact-access`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const j = (await res.json()) as ContactAccessPayload & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setLoadErr(typeof j.error === "string" ? j.error : "Error");
          setLoading(false);
          return;
        }
        setData(j);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadErr(lang === "tr" ? "Bağlantı hatası." : "Connection error.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId, lang, reset, refreshKey]);

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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function payUnlock() {
    if (!userId) return;
    setPayErr("");
    setPaying(true);
    const res = await fetch(`/api/members/${encodeURIComponent(userId)}/contact-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "unlock" }),
    });
    const j = await res.json().catch(() => ({}));
    setPaying(false);
    if (!res.ok) {
      setPayErr(typeof j.error === "string" ? j.error : lang === "tr" ? "Ödeme yapılamadı." : "Payment failed.");
      return;
    }
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  if (!open || !userId) return null;

  const t =
    lang === "tr"
      ? {
          title: "Üye iletişim bilgileri",
          close: "Kapat",
          loading: "Yükleniyor…",
          login: "Giriş yapın",
          register: "Üye kayıt",
          balance: "Bakiye",
          pay: "Kredi ile öde",
          topup: "Bakiye yükle",
          feeLabel: "Ücret (tek sefer)",
          freeHint: "İletişim ücreti kapalı; bilgiler aşağıda.",
          bidOwnerFree:
            "Bu üyenin onaylı ilanına teklif verdiniz; iletişim bilgileri ek ücrete tabi değildir.",
          paidOnceHint:
            "Bu üye için iletişim ücreti ödediniz; bilgileri istediğiniz zaman tekrar görüntüleyebilirsiniz.",
          guest: "İletişim bilgilerini görmek için giriş yapın (onaylı üye).",
          pending: "Üyelik onayınız bekleniyor.",
          email: "E-posta",
          phone: "Telefon",
          province: "İl",
          district: "İlçe",
          profession: "Meslek",
          authorizedPerson: "Yetkili kişi",
        }
      : {
          title: "Member contact details",
          close: "Close",
          loading: "Loading…",
          login: "Sign in",
          register: "Register",
          balance: "Balance",
          pay: "Pay with credit",
          topup: "Add credit",
          feeLabel: "Fee (one-time)",
          freeHint: "No contact fee; details below.",
          bidOwnerFree:
            "You placed a bid on this member’s approved listing; contact details are included without an extra fee.",
          paidOnceHint:
            "You already paid to unlock this member’s contact details; you can view them anytime.",
          guest: "Sign in as an approved member to view contact details.",
          pending: "Your membership approval is pending.",
          email: "Email",
          phone: "Phone",
          province: "Province",
          district: "District",
          profession: "Profession",
          authorizedPerson: "Authorized contact",
        };

  const fee = data?.settings?.memberContactFeeAmountTry ?? 0;
  const loginNext = loginNextPath ?? "/muhendis-ara";
  const loginHref =
    lang === "en"
      ? `/login?lang=en&next=${encodeURIComponent(loginNext)}`
      : `/login?next=${encodeURIComponent(loginNext)}`;
  const membersHref = lang === "en" ? "/members?lang=en" : "/members";
  const topupHref =
    lang === "en"
      ? `/panel/user/topup?lang=en&amount=${fee}`
      : `/panel/user/topup?amount=${fee}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-contact-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t.close}
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-orange-200 bg-[#fff7ed] p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="member-contact-title" className="text-lg font-bold text-orange-950">
            {t.title}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-orange-100"
            onClick={onClose}
          >
            {t.close}
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">{t.loading}</p>
        ) : loadErr ? (
          <p className="mt-4 text-sm text-red-700">{loadErr}</p>
        ) : data?.target ? (
          <div className="mt-4 space-y-4">
            <div className="flex gap-3 rounded-xl border border-orange-200 bg-white/90 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-orange-100">
                {data.target.profilePhotoUrl ? (
                  <Image
                    src={data.target.profilePhotoUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl text-orange-400">
                    👤
                  </span>
                )}
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-slate-900">{data.target.name || "—"}</p>
                <p className="text-xs text-slate-500">
                  #{data.target.memberNumber}
                  {data.target.professionName ? (
                    <span className="text-slate-600"> · {data.target.professionName}</span>
                  ) : null}
                </p>
              </div>
            </div>

            {!data.session ? (
              <div className="rounded-xl border border-orange-200 bg-white/80 p-4 text-sm text-slate-700">
                <p>{t.guest}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn-primary inline-block text-center text-sm" href={loginHref}>
                    {t.login}
                  </Link>
                  <Link
                    className="chip inline-flex items-center border-orange-300 bg-white text-sm text-orange-900"
                    href={membersHref}
                  >
                    {t.register}
                  </Link>
                </div>
              </div>
            ) : data.pendingApproval ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t.pending}
              </p>
            ) : data.contact ? (
              <div className="space-y-2 rounded-xl border border-orange-200 bg-white p-4 text-sm">
                {data.freeListingBidderAccess && data.access.requiresPayment ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">
                    {t.bidOwnerFree}
                  </p>
                ) : null}
                {data.access.requiresPayment && data.access.hasPaid && !data.freeListingBidderAccess ? (
                  <p className="rounded-lg border border-orange-200/80 bg-orange-50/90 px-2 py-1.5 text-xs text-orange-950">
                    {t.paidOnceHint}
                  </p>
                ) : null}
                {!data.access.requiresPayment ? (
                  <p className="text-xs text-slate-500">{t.freeHint}</p>
                ) : null}
                <dl className="grid gap-2 sm:grid-cols-[6rem_1fr]">
                  {data.contact.authorizedPersonName ? (
                    <>
                      <dt className="text-slate-500">{t.authorizedPerson}</dt>
                      <dd className="font-medium text-slate-900">{data.contact.authorizedPersonName}</dd>
                    </>
                  ) : null}
                  <dt className="text-slate-500">{t.email}</dt>
                  <dd className="break-all font-medium text-slate-900">{data.contact.email}</dd>
                  <dt className="text-slate-500">{t.phone}</dt>
                  <dd className="font-medium text-slate-900">{data.contact.phone || "—"}</dd>
                  <dt className="text-slate-500">{t.province}</dt>
                  <dd className="font-medium text-slate-900">{data.contact.province || "—"}</dd>
                  <dt className="text-slate-500">{t.district}</dt>
                  <dd className="font-medium text-slate-900">{data.contact.district || "—"}</dd>
                </dl>
              </div>
            ) : data.access.requiresPayment ? (
              <div className="space-y-3 rounded-xl border border-orange-200 bg-white p-4 text-sm">
                <p>
                  {t.feeLabel}: <strong>{fee} TL</strong>
                </p>
                <p>
                  {t.balance}: <strong>{data.balance} TL</strong>
                </p>
                {payErr ? <p className="text-xs text-red-700">{payErr}</p> : null}
                {data.balance >= fee ? (
                  <button
                    type="button"
                    className="btn-primary w-full disabled:opacity-60"
                    disabled={paying}
                    onClick={() => void payUnlock()}
                  >
                    {paying ? "…" : t.pay}
                  </button>
                ) : (
                  <Link className="btn-primary block w-full text-center" href={topupHref}>
                    {t.topup}
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {lang === "tr"
                  ? "İletişim ücreti kapalı veya tutar 0 TL. Yönetici paneli → Teklif ayarları → «İletişim bilgisi için ücret al» ile açılabilir."
                  : "Contact fee is off or set to 0 TL. Enable it under Admin → Bid settings → «Charge for contact details»."}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
