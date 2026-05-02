"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { adminUrl } from "@/lib/adminUrls";

type Feedback = { kind: "ok" | "err"; text: string } | null;

const LOAD_TIMEOUT_MS = 25_000;

export default function SignupSmsProviderClient() {
  const [signupIletiMerkeziEnabled, setSignupIletiMerkeziEnabled] = useState(false);
  const [signupIletiMerkeziApiKey, setSignupIletiMerkeziApiKey] = useState("");
  const [signupIletiMerkeziApiSecret, setSignupIletiMerkeziApiSecret] = useState("");
  const [signupIletiMerkeziSender, setSignupIletiMerkeziSender] = useState("");
  const [hasIletiMerkeziSecret, setHasIletiMerkeziSecret] = useState(false);
  const [signupSmsHttpEnabled, setSignupSmsHttpEnabled] = useState(false);
  const [signupSmsHttpMethod, setSignupSmsHttpMethod] = useState<"POST" | "GET">("POST");
  const [signupSmsHttpUrl, setSignupSmsHttpUrl] = useState("");
  const [signupSmsHttpHeadersJson, setSignupSmsHttpHeadersJson] = useState("{}");
  const [signupSmsHttpBodyTemplate, setSignupSmsHttpBodyTemplate] = useState("");
  const [signupSmsAuthHeaderName, setSignupSmsAuthHeaderName] = useState("");
  const [signupSmsAuthHeaderValue, setSignupSmsAuthHeaderValue] = useState("");
  const [signupSmsHttpTimeoutMs, setSignupSmsHttpTimeoutMs] = useState(15000);
  const [twilioFallbackAvailable, setTwilioFallbackAvailable] = useState(false);
  const [hasAuthHeaderValue, setHasAuthHeaderValue] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const loadGen = useRef(0);

  const load = useCallback(async (): Promise<boolean> => {
    const g = ++loadGen.current;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), LOAD_TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch("/api/admin/signup-sms-provider", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (g !== loadGen.current) return false;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setFeedback({
        kind: "err",
        text: aborted
          ? `Ayarlar ${LOAD_TIMEOUT_MS / 1000} sn içinde yüklenemedi (zaman aşımı). Sunucu, veritabanı (DATABASE_URL) veya ağı kontrol edin.`
          : "Ağ hatası: ayarlar yüklenemedi.",
      });
      setSettingsReady(true);
      return false;
    }
    clearTimeout(timer);
    if (g !== loadGen.current) return false;

    let data: Record<string, unknown> = {};
    try {
      const text = await r.text();
      if (text) data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      setFeedback({
        kind: "err",
        text: r.ok ? "Sunucu yanıtı okunamadı (geçersiz JSON)." : `Ayarlar yüklenemedi (HTTP ${r.status}).`,
      });
      setSettingsReady(true);
      return false;
    }
    if (!r.ok) {
      setFeedback({ kind: "err", text: apiErrorMessage(data.error, "Ayarlar yüklenemedi.") });
      setSettingsReady(true);
      return false;
    }
    setSignupIletiMerkeziEnabled(Boolean(data.signupIletiMerkeziEnabled));
    setSignupIletiMerkeziApiKey(String(data.signupIletiMerkeziApiKey || ""));
    setSignupIletiMerkeziApiSecret("");
    setHasIletiMerkeziSecret(Boolean(data.hasIletiMerkeziSecret));
    setSignupIletiMerkeziSender(String(data.signupIletiMerkeziSender || ""));
    setSignupSmsHttpEnabled(Boolean(data.signupSmsHttpEnabled));
    setSignupSmsHttpMethod(data.signupSmsHttpMethod === "GET" ? "GET" : "POST");
    setSignupSmsHttpUrl(String(data.signupSmsHttpUrl || ""));
    setSignupSmsHttpHeadersJson(String(data.signupSmsHttpHeadersJson || "{}"));
    setSignupSmsHttpBodyTemplate(String(data.signupSmsHttpBodyTemplate || ""));
    setSignupSmsAuthHeaderName(String(data.signupSmsAuthHeaderName || ""));
    setSignupSmsAuthHeaderValue("");
    setHasAuthHeaderValue(Boolean(data.hasAuthHeaderValue));
    setSignupSmsHttpTimeoutMs(
      typeof data.signupSmsHttpTimeoutMs === "number" ? data.signupSmsHttpTimeoutMs : 15000,
    );
    setTwilioFallbackAvailable(Boolean(data.twilioFallbackAvailable));
    setSettingsReady(true);
    return true;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const body: Record<string, unknown> = {
      signupIletiMerkeziEnabled,
      signupIletiMerkeziApiKey: signupIletiMerkeziApiKey.trim(),
      signupIletiMerkeziSender: signupIletiMerkeziSender.trim(),
      signupSmsHttpEnabled,
      signupSmsHttpMethod,
      signupSmsHttpUrl: signupSmsHttpUrl.trim(),
      signupSmsHttpHeadersJson: signupSmsHttpHeadersJson.trim() || "{}",
      signupSmsHttpBodyTemplate: signupSmsHttpBodyTemplate.trim(),
      signupSmsAuthHeaderName: signupSmsAuthHeaderName.trim(),
      signupSmsHttpTimeoutMs: Number(signupSmsHttpTimeoutMs) || 15000,
    };
    if (signupSmsAuthHeaderValue.trim().length > 0) {
      body.signupSmsAuthHeaderValue = signupSmsAuthHeaderValue.trim();
    }
    if (signupIletiMerkeziApiSecret.trim().length > 0) {
      body.signupIletiMerkeziApiSecret = signupIletiMerkeziApiSecret.trim();
    }
    const res = await fetch("/api/admin/signup-sms-provider", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ kind: "err", text: apiErrorMessage(data.error, "Kayıt başarısız.") });
      return;
    }
    const reloaded = await load();
    if (reloaded) {
      setFeedback({ kind: "ok", text: "Kaydedildi." });
    } else {
      setFeedback({
        kind: "err",
        text: "Kayıt sunucuya yazıldı; form sunucudan yenilenemedi. Sayfayı yenileyin veya ağ sekmesini kontrol edin.",
      });
    }
  }

  async function onTest() {
    setTestBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/signup-sms-provider/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: "err", text: apiErrorMessage(data.error, "Test başarısız.") });
        return;
      }
      setFeedback({
        kind: "ok",
        text: typeof data.message === "string" ? data.message : "Test tamam.",
      });
    } catch {
      setFeedback({ kind: "err", text: "Test isteği gönderilemedi." });
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={adminUrl()} className="chip">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Kayıt — telefon SMS (İleti Merkezi / HTTP / Twilio)</h1>
      </div>
      <p className="text-sm text-slate-600">
        Öncelik: <strong className="font-medium text-slate-800">İleti Merkezi</strong> (aşağıda etkin ve bilgiler
        doluysa) → genel HTTP webhook → Twilio. İleti Merkezi{" "}
        <a
          className="text-orange-700 underline"
          href="https://api.iletimerkezi.com/v1/send-sms/json"
          target="_blank"
          rel="noreferrer"
        >
          JSON API
        </a>{" "}
        ile uyumludur; hash üretimi Laravel{" "}
        <code className="rounded bg-slate-100 px-1">macellan/ileti-merkezi</code> paketi ile aynıdır (HMAC-SHA256).
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-800">Geliştirici referansı (REST)</p>
        <p className="mt-1.5 text-slate-600">
          Üyelik akışı (e-posta doğrulandıktan sonra): <code className="rounded bg-white px-1">POST /api/register/request-phone-otp</code>{" "}
          (SMS gönderir), <code className="rounded bg-white px-1">POST /api/register/verify-phone-otp</code> (kodu doğrular). Üretimde
          kanal yoksa ve <code className="rounded bg-white px-1">SIGNUP_OTP_ALLOW_LOG_FALLBACK</code> kapalıysa telefon adımı 503
          döner; geliştirme modunda veya bu env açıkken kod yine veritabanına yazılır.
        </p>
        <p className="mt-2 text-slate-600">
          Bu sayfa: <code className="rounded bg-white px-1">GET</code> / <code className="rounded bg-white px-1">POST /api/admin/signup-sms-provider</code>,{" "}
          <code className="rounded bg-white px-1">POST /api/admin/signup-sms-provider/test</code> (sadece süper yönetici). Dev sunucu yavaş,
          sol alttaki <strong>N</strong> yanıp söner; gerçek yük için <code className="rounded bg-white px-1">next build</code> +{" "}
          <code className="rounded bg-white px-1">next start</code> ile kıyaslayın.
        </p>
      </div>
      {feedback && (
        <p
          role={feedback.kind === "err" ? "alert" : "status"}
          className={
            feedback.kind === "err"
              ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          }
        >
          {feedback.text}
        </p>
      )}
      <form onSubmit={onSave} className="glass-card space-y-4 rounded-2xl p-5">
        {!settingsReady && (
          <p className="text-sm text-slate-600" aria-live="polite">
            Ayarlar sunucudan yükleniyor… Form kısa süre sonra düzenlenebilir olacak (yüklenmeden yazmak, boş kayda
            yol açabiliyordu).
          </p>
        )}
        <fieldset disabled={!settingsReady} className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-60">
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 space-y-3">
          <p className="text-sm font-semibold text-orange-950">İleti Merkezi</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={signupIletiMerkeziEnabled}
              onChange={(e) => setSignupIletiMerkeziEnabled(e.target.checked)}
              className="accent-orange-600"
            />
            İleti Merkezi ile gönder (öncelikli)
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700" htmlFor="im-key">
                API anahtarı (key)
              </label>
              <input
                id="im-key"
                value={signupIletiMerkeziApiKey}
                onChange={(e) => setSignupIletiMerkeziApiKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700" htmlFor="im-secret">
                Gizli anahtar (secret){" "}
                {hasIletiMerkeziSecret && (
                  <span className="font-normal text-slate-500">(kayıtlı — değiştirmek için yazın)</span>
                )}
              </label>
              <input
                id="im-secret"
                type="password"
                value={signupIletiMerkeziApiSecret}
                onChange={(e) => setSignupIletiMerkeziApiSecret(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700" htmlFor="im-sender">
                Gönderici başlığı (origin)
              </label>
              <input
                id="im-sender"
                value={signupIletiMerkeziSender}
                onChange={(e) => setSignupIletiMerkeziSender(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                placeholder="Panelde onaylı başlık"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Kurulum:{" "}
            <a
              className="text-orange-800 underline"
              href="https://www.iletimerkezi.com/yardim-merkezi/json-ile-ilk-sms-api-istegi-nasil-yapilir"
              target="_blank"
              rel="noreferrer"
            >
              JSON ile ilk SMS isteği
            </a>
            . Numara E.164’ten otomatik rakama çevrilir (örn. +90 → 90…). İYS alanı şu an 0 (bilgilendirme) olarak
            gönderilir; ticari şablonlar için panelden İYS kurallarını kontrol edin.
          </p>
          <p className="text-xs font-medium text-amber-900">
            İlk kayıtta veya gizli anahtarı değiştirdiğinizde «Gizli anahtar» alanını doldurup alttaki «Kaydet»e
            basın; yalnızca kutuyu işaretlemek secret’ı kaydetmez. «İleti Merkezi ile gönder» kutusu SMS’in bu kanaldan
            gitmesi içindir; anahtar ve gönderici başlığı kutunun kapalı olduğu durumda da kaydedilir.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-700">Genel HTTP webhook (İleti Merkezi kapalı veya eksikse)</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={signupSmsHttpEnabled}
            onChange={(e) => setSignupSmsHttpEnabled(e.target.checked)}
            className="accent-orange-600"
          />
          HTTP(S) webhook etkin
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="sms-method">
              HTTP metodu
            </label>
            <select
              id="sms-method"
              value={signupSmsHttpMethod}
              onChange={(e) => setSignupSmsHttpMethod(e.target.value === "GET" ? "GET" : "POST")}
              className="w-full rounded-lg border border-slate-300 p-2"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="sms-timeout">
              Zaman aşımı (ms)
            </label>
            <input
              id="sms-timeout"
              type="number"
              min={3000}
              max={120000}
              value={signupSmsHttpTimeoutMs}
              onChange={(e) => setSignupSmsHttpTimeoutMs(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="sms-url">
            Webhook URL
          </label>
          <input
            id="sms-url"
            value={signupSmsHttpUrl}
            onChange={(e) => setSignupSmsHttpUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
            placeholder="https://api.ornek.com/sms"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="sms-headers">
            Ek başlıklar (JSON)
          </label>
          <textarea
            id="sms-headers"
            rows={3}
            value={signupSmsHttpHeadersJson}
            onChange={(e) => setSignupSmsHttpHeadersJson(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs"
            placeholder='{"Content-Type":"application/json"}'
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="sms-body">
            POST gövde şablonu (boşsa varsayılan JSON)
          </label>
          <textarea
            id="sms-body"
            rows={5}
            value={signupSmsHttpBodyTemplate}
            onChange={(e) => setSignupSmsHttpBodyTemplate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs"
            placeholder='{"to":"{{phone}}","text":"{{message}}"}'
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="sms-auth-name">
              Kimlik başlığı adı (isteğe bağlı)
            </label>
            <input
              id="sms-auth-name"
              value={signupSmsAuthHeaderName}
              onChange={(e) => setSignupSmsAuthHeaderName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              placeholder="Authorization"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="sms-auth-val">
              Kimlik başlığı değeri{" "}
            {hasAuthHeaderValue && <span className="text-slate-500">(kayıtlı — değiştirmek için yazın)</span>}
            </label>
            <input
              id="sms-auth-val"
              type="password"
              value={signupSmsAuthHeaderValue}
              onChange={(e) => setSignupSmsAuthHeaderValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              placeholder="Bearer … veya API anahtarı"
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Twilio yedek: ortamda{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_ACCOUNT_SID</code>,{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_AUTH_TOKEN</code>,{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_FROM_NUMBER</code> — şu an{" "}
          {twilioFallbackAvailable ? (
            <span className="font-medium text-emerald-700">tanımlı görünüyor</span>
          ) : (
            <span className="font-medium text-amber-800">eksik olabilir</span>
          )}
          .
        </p>
        <button type="submit" className="btn-primary">
          Kaydet
        </button>
        </fieldset>
      </form>
      <section className="glass-card space-y-3 rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Test gönderimi</h2>
        <p className="text-xs text-slate-600">
          Gerçek bir E.164 numarası girin; rastgele 6 haneli test kodu gönderilir (üretim SMS kotanızı kullanır).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 p-2 text-sm"
            placeholder="+905551234567"
            autoComplete="tel"
          />
          <button
            type="button"
            className="chip"
            disabled={testBusy || !testPhone.trim() || !settingsReady}
            onClick={() => void onTest()}
          >
            {testBusy ? "Gönderiliyor…" : "Test SMS"}
          </button>
        </div>
      </section>
    </main>
  );
}
