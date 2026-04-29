"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type GetPayload = {
  degraded?: boolean;
  degradedMessage?: string;
  dbConnectionError?: boolean;
  appUrl: string;
  iyzico: {
    baseUrl: string;
    baseUrlOptions: readonly { value: string; label: string }[];
    iyzicoApiKeyMasked: string;
    iyzicoSecretKeyMasked: string;
    fromDatabase: { hasApiKey: boolean; hasSecret: boolean };
    fromEnv: { hasApiKey: boolean; hasSecret: boolean; hasBaseUrl: boolean };
    iyzicoCallbackUrl: string;
  };
  paytr: {
    merchantId: string;
    testMode: boolean;
    merchantKeyMasked: string;
    merchantSaltMasked: string;
    fromDatabase: { hasId: boolean; hasKey: boolean; hasSalt: boolean };
    fromEnv: { hasId: boolean; hasKey: boolean; hasSalt: boolean };
    paytrCallbackUrl: string;
  };
  sovos: {
    eInvoiceMode: "mock" | "sovos";
    sovosApiBaseUrl: string;
    sovosApiKeyMasked: string;
    sovosApiSecretMasked: string;
    fromDatabase: { hasBaseUrl: boolean; hasKey: boolean; hasSecret: boolean };
    fromEnv: { hasBaseUrl: boolean; hasKey: boolean; hasSecret: boolean; eInvoiceModeEnv: boolean };
  };
};

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}

export default function AdminOdemeClient() {
  const [meta, setMeta] = useState<GetPayload | null>(null);
  const [message, setMessage] = useState("");
  const [iyzicoBaseUrl, setIyzicoBaseUrl] = useState("");
  const [iyzicoApiKey, setIyzicoApiKey] = useState("");
  const [iyzicoSecretKey, setIyzicoSecretKey] = useState("");
  const [paytrMerchantId, setPaytrMerchantId] = useState("");
  const [paytrMerchantKey, setPaytrMerchantKey] = useState("");
  const [paytrMerchantSalt, setPaytrMerchantSalt] = useState("");
  const [paytrTestMode, setPaytrTestMode] = useState(false);
  const [eInvoiceMode, setEInvoiceMode] = useState<"mock" | "sovos">("mock");
  const [sovosApiBaseUrl, setSovosApiBaseUrl] = useState("");
  const [sovosApiKey, setSovosApiKey] = useState("");
  const [sovosApiSecret, setSovosApiSecret] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) setLoadError("");
      const r = await fetch("/api/admin/payment-providers", { credentials: "include", cache: "no-store" });
      const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (cancelled) return;
      if (!r.ok && !("iyzico" in data)) {
        const errMsg = data.error;
        setLoadError(
          typeof errMsg === "string" ? errMsg : `Yükleme hatası (HTTP ${r.status}).`,
        );
        return;
      }
      const iy = data.iyzico;
      const py = data.paytr;
      const sv = data.sovos;
      if (!iy || typeof iy !== "object" || !py || typeof py !== "object" || !sv || typeof sv !== "object") {
        setLoadError("Beklenmeyen yanıt (API).");
        return;
      }
      const payload = data as GetPayload;
      setMeta(payload);
      setIyzicoBaseUrl(payload.iyzico.baseUrl || payload.iyzico.baseUrlOptions[0].value);
      setPaytrMerchantId(payload.paytr.merchantId);
      setPaytrTestMode(payload.paytr.testMode);
      setEInvoiceMode(payload.sovos.eInvoiceMode);
      setSovosApiBaseUrl(payload.sovos.sovosApiBaseUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSaveIyzico(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/payment-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iyzicoBaseUrl,
        ...(iyzicoApiKey.trim() ? { iyzicoApiKey: iyzicoApiKey.trim() } : {}),
        ...(iyzicoSecretKey.trim() ? { iyzicoSecretKey: iyzicoSecretKey.trim() } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "iyzico kayit hatasi.");
      return;
    }
    setMessage("iyzico ayarlari kaydedildi.");
    setIyzicoApiKey("");
    setIyzicoSecretKey("");
    const j = (await (await fetch("/api/admin/payment-providers")).json()) as GetPayload;
    setMeta(j);
  }

  async function onSavePaytr(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/payment-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paytrMerchantId: paytrMerchantId.trim(),
        paytrTestMode,
        ...(paytrMerchantKey.trim() ? { paytrMerchantKey: paytrMerchantKey.trim() } : {}),
        ...(paytrMerchantSalt.trim() ? { paytrMerchantSalt: paytrMerchantSalt.trim() } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "PayTR kayit hatasi.");
      return;
    }
    setMessage("PayTR ayarlari kaydedildi.");
    setPaytrMerchantKey("");
    setPaytrMerchantSalt("");
    const j = (await (await fetch("/api/admin/payment-providers")).json()) as GetPayload;
    setMeta(j);
  }

  async function onSaveSovos(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/payment-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eInvoiceMode,
        sovosApiBaseUrl: sovosApiBaseUrl.trim(),
        ...(sovosApiKey.trim() ? { sovosApiKey: sovosApiKey.trim() } : {}),
        ...(sovosApiSecret.trim() ? { sovosApiSecret: sovosApiSecret.trim() } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Sovos kayit hatasi.");
      return;
    }
    setMessage("Sovos e-fatura ayarlari kaydedildi.");
    setSovosApiKey("");
    setSovosApiSecret("");
    const j = (await (await fetch("/api/admin/payment-providers")).json()) as GetPayload;
    setMeta(j);
    setEInvoiceMode(j.sovos.eInvoiceMode);
    setSovosApiBaseUrl(j.sovos.sovosApiBaseUrl);
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
        <Link className="admin-back-link" href="/admin">
          ← Yönetici ana panel
        </Link>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{loadError}</p>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <p className="text-sm text-slate-600">Yükleniyor…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yönetici ana panel
      </Link>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-orange-950">Ödeme sağlayıcıları</h1>
        <p className="text-sm text-slate-600">
          iyzico, PayTR ve <strong>Sovos e-fatura</strong> API bilgilerinizi aşağıdaki formlardan girin. Kayıt varsa önce
          veritabanı; yoksa <code className="rounded bg-orange-50 px-1">.env</code> (Vercel ortam değişkenleri) yedek
          olarak kullanılır. Sovos modu ve anahtarları <strong>yalnızca süper yönetici</strong> bu sayfadan yönetir;
          yardımcı yöneticiler fatura listesinde yalnızca onay verir.
        </p>
        <p className="text-xs text-slate-500">
          Site adresi (geri donusler): <code className="rounded bg-orange-50 px-1">{meta.appUrl}</code>
        </p>
      </header>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>
      ) : null}
      {meta.degraded && meta.degradedMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            meta.dbConnectionError
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-amber-200 bg-amber-50/95 text-amber-950"
          }`}
        >
          <p className="font-medium">Ödeme ayarları kısıtlı mod</p>
          <p className="mt-1 text-xs leading-relaxed opacity-95">{meta.degradedMessage}</p>
        </div>
      ) : null}

      <section className="glass-card space-y-4 rounded-2xl p-5">
        <h2 className="border-b border-orange-200 pb-2 text-lg font-semibold text-orange-950">iyzico (Checkout Form)</h2>
        <ul className="list-inside list-disc text-xs text-slate-600">
          <li>
            <strong>API / Checkout:</strong> iyzi Panel → Ayarlar → API bilgileri: <em>API Anahtar</em>, <em>Güvenli
            Anahtar</em>
          </li>
          <li>Test: Sandbox API bilgileri; canlı: Uretim API uç noktasi (asagidaki liste).</li>
          <li>
            <strong>Callback (otomatik):</strong> Sistem, ödeme sonucu için{" "}
            <code className="rounded bg-slate-100 px-1 text-[11px]">{meta.iyzico.iyzicoCallbackUrl}</code>{" "}
            adresini yollar; ekstra yönlendirme tanımı gerekmez.
          </li>
        </ul>

        {meta.iyzico.fromDatabase.hasApiKey || meta.iyzico.fromDatabase.hasSecret ? (
          <p className="text-xs text-slate-500">
            Veritabaninda: API {meta.iyzico.fromDatabase.hasApiKey ? `(${meta.iyzico.iyzicoApiKeyMasked || "kayitli"})` : "yok"}{" "}
            · Gizli {meta.iyzico.fromDatabase.hasSecret ? `(${meta.iyzico.iyzicoSecretKeyMasked || "kayitli"})` : "yok"}
          </p>
        ) : null}
        {meta.iyzico.fromEnv.hasApiKey || meta.iyzico.fromEnv.hasSecret ? (
          <p className="text-xs text-amber-800">
            Ayrica ortamda tanim: IYZICO_API_KEY {meta.iyzico.fromEnv.hasApiKey ? "var" : "yok"} · IYZICO_SECRET_KEY{" "}
            {meta.iyzico.fromEnv.hasSecret ? "var" : "yok"}
            {meta.iyzico.fromEnv.hasBaseUrl ? " · IYZICO_BASE_URL var" : ""}
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSaveIyzico}>
          <div>
            <label className="text-xs font-medium text-slate-600">Iyzi ödeme sunucu adresi (Base URL)</label>
            <select
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={iyzicoBaseUrl}
              onChange={(e) => setIyzicoBaseUrl(e.target.value)}
            >
              {meta.iyzico.baseUrlOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldHint>Panelde gordugunuz mod (test / canli) ile ayni uç noktayi secin.</FieldHint>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">API Key (IYZICO_API_KEY)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={meta.iyzico.fromDatabase.hasApiKey || meta.iyzico.fromEnv.hasApiKey ? "Degistirmek icin yeni deger yazin" : "Iyzi paneldeki API anahtari"}
              value={iyzicoApiKey}
              onChange={(e) => setIyzicoApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Secret Key (IYZICO_SECRET_KEY)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={meta.iyzico.fromDatabase.hasSecret || meta.iyzico.fromEnv.hasSecret ? "Degistirmek icin yeni deger yazin" : "Guvenli anahtar"}
              value={iyzicoSecretKey}
              onChange={(e) => setIyzicoSecretKey(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit">
            iyzico ayarlarini kaydet
          </button>
        </form>
      </section>

      <section className="glass-card space-y-4 rounded-2xl p-5">
        <h2 className="border-b border-orange-200 pb-2 text-lg font-semibold text-orange-950">PayTR (iFrame)</h2>
        <ul className="list-inside list-disc text-xs text-slate-600">
          <li>
            <strong>Magaza bilgileri:</strong> PayTR Mağaza Paneli → <em>Entegrasyon bilgileri</em> — Mağaza no (ID),{" "}
            <em>Mağaza parolası</em>, <em>Mağaza gizli anahtarı (salt)</em>
          </li>
          <li>
            <strong>Bildirim URL (zorunlu):</strong> PayTR panelde &quot;Bildirim URL&quot; alanına (iframe entegrasyonu)
            asagidaki adresi aynen yazin:
          </li>
        </ul>
        <p className="break-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-amber-100">
          {meta.paytr.paytrCallbackUrl}
        </p>
        <p className="text-xs text-amber-900">
          Bu adim yapilmadan kredi dusmez; islem &quot;Devam ediyor&quot; kalir. 3D / iframe tamamlandiginda PayTR
          sunucunuz buna POST atar; yanit sadece <code>OK</code> olmalidir.
        </p>

        {meta.paytr.fromDatabase.hasId || meta.paytr.fromDatabase.hasKey || meta.paytr.fromDatabase.hasSalt ? (
          <p className="text-xs text-slate-500">
            Veritabani: Magaza {meta.paytr.fromDatabase.hasId ? `#${meta.paytr.merchantId}` : "yok"} · Parola{" "}
            {meta.paytr.merchantKeyMasked || (meta.paytr.fromDatabase.hasKey ? "•••kayitli" : "yok")} · Tuz{" "}
            {meta.paytr.merchantSaltMasked || (meta.paytr.fromDatabase.hasSalt ? "•••kayitli" : "yok")}
          </p>
        ) : null}
        {meta.paytr.fromEnv.hasId || meta.paytr.fromEnv.hasKey || meta.paytr.fromEnv.hasSalt ? (
          <p className="text-xs text-amber-800">
            Ortam: PAYTR_MERCHANT_ID {meta.paytr.fromEnv.hasId ? "var" : "yok"} · _KEY {meta.paytr.fromEnv.hasKey ? "var" : "yok"}{" "}
            · _SALT {meta.paytr.fromEnv.hasSalt ? "var" : "yok"}
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSavePaytr}>
          <div>
            <label className="text-xs font-medium text-slate-600">Magaza no (merchant_id)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              value={paytrMerchantId}
              onChange={(e) => setPaytrMerchantId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Magaza parolasi (merchant_key)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={meta.paytr.fromDatabase.hasKey || meta.paytr.fromEnv.hasKey ? "Degistirmek icin yeni" : "Entegrasyondan kopya"}
              value={paytrMerchantKey}
              onChange={(e) => setPaytrMerchantKey(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Magaza gizli anahtar / tuz (merchant_salt)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={meta.paytr.fromDatabase.hasSalt || meta.paytr.fromEnv.hasSalt ? "Degistirmek icin yeni" : "Entegrasyondan kopya"}
              value={paytrMerchantSalt}
              onChange={(e) => setPaytrMerchantSalt(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={paytrTestMode} onChange={(e) => setPaytrTestMode(e.target.checked)} />
            Test modu (1) — canli magazada test karti icin; panel/baglanti ne gerektiriyorsa uyun
          </label>
          <button className="btn-primary" type="submit">
            PayTR ayarlarini kaydet
          </button>
        </form>
      </section>

      <section className="glass-card space-y-4 rounded-2xl p-5">
        <h2 className="border-b border-orange-200 pb-2 text-lg font-semibold text-orange-950">
          Sovos e-Fatura / e-Arşiv
        </h2>
        <ul className="list-inside list-disc text-xs text-slate-600">
          <li>
            Entegratörden aldığınız <strong>API taban adresi</strong> ve kimlik bilgilerini burada saklayın; fatura kesim
            isteği çalışırken sunucu önce bu kayıtları, eksikse <code className="rounded bg-slate-100 px-1">SOVOS_*</code> /{" "}
            <code className="rounded bg-slate-100 px-1">EINVOICE_MODE</code> ortam değişkenlerini kullanır.
          </li>
          <li>
            <strong>Mock:</strong> Geliştirme ve test; gerçek GİB gönderimi yok. <strong>Sovos:</strong> Canlı mod (HTTP
            gövdesi <code className="rounded bg-slate-100 px-1">sovosIssue.ts</code> içinde tamamlanacak).
          </li>
        </ul>

        {meta.sovos.fromDatabase.hasBaseUrl || meta.sovos.fromDatabase.hasKey || meta.sovos.fromDatabase.hasSecret ? (
          <p className="text-xs text-slate-500">
            Veritabani: URL {meta.sovos.fromDatabase.hasBaseUrl ? "kayitli" : "yok"} · Anahtar{" "}
            {meta.sovos.fromDatabase.hasKey ? `(${meta.sovos.sovosApiKeyMasked || "•••"})` : "yok"} · Gizli{" "}
            {meta.sovos.fromDatabase.hasSecret ? `(${meta.sovos.sovosApiSecretMasked || "•••"})` : "yok"}
          </p>
        ) : null}
        {meta.sovos.fromEnv.hasBaseUrl ||
        meta.sovos.fromEnv.hasKey ||
        meta.sovos.fromEnv.hasSecret ||
        meta.sovos.fromEnv.eInvoiceModeEnv ? (
          <p className="text-xs text-amber-800">
            Ortam yedegi: SOVOS_API_BASE_URL {meta.sovos.fromEnv.hasBaseUrl ? "var" : "yok"} · SOVOS_API_KEY{" "}
            {meta.sovos.fromEnv.hasKey ? "var" : "yok"} · SOVOS_API_SECRET {meta.sovos.fromEnv.hasSecret ? "var" : "yok"}{" "}
            · EINVOICE_MODE {meta.sovos.fromEnv.eInvoiceModeEnv ? "var" : "yok"}
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSaveSovos}>
          <div>
            <label className="text-xs font-medium text-slate-600">Fatura modu</label>
            <select
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={eInvoiceMode}
              onChange={(e) => setEInvoiceMode(e.target.value === "sovos" ? "sovos" : "mock")}
            >
              <option value="mock">Mock (test, gercek kesim yok)</option>
              <option value="sovos">Sovos (canli API — stub asama)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Sovos API taban URL</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              placeholder="https://..."
              value={sovosApiBaseUrl}
              onChange={(e) => setSovosApiBaseUrl(e.target.value)}
              autoComplete="off"
            />
            <FieldHint>Sondaki / olmadan yazin; entegratör dokümantasyonundaki kök adres.</FieldHint>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">API anahtarı / istemci kimliği</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={
                meta.sovos.fromDatabase.hasKey || meta.sovos.fromEnv.hasKey
                  ? "Degistirmek icin yeni deger"
                  : "Sovos panelinden"
              }
              value={sovosApiKey}
              onChange={(e) => setSovosApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">API gizli anahtarı (veya parola)</label>
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 font-mono text-sm"
              type="password"
              autoComplete="off"
              placeholder={
                meta.sovos.fromDatabase.hasSecret || meta.sovos.fromEnv.hasSecret
                  ? "Degistirmek icin yeni deger"
                  : "Sovos panelinden"
              }
              value={sovosApiSecret}
              onChange={(e) => setSovosApiSecret(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit">
            Sovos e-fatura ayarlarini kaydet
          </button>
        </form>
      </section>
    </main>
  );
}
