"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { filterAllowedWebhookUrls, parseNewAdEmailWebhookUrls, stringifyNewAdEmailWebhookUrls } from "@/lib/newAdEmailWebhooksJson";
import type { NewAdApprovedWebhookPayload } from "@/lib/newAdApprovedWebhookPayload";
import { adminUrl } from "@/lib/adminUrls";

export default function IlanEpostaAyarPage() {
  const [newAdEmailAutoEnabled, setNewAdEmailAutoEnabled] = useState(true);
  const [newAdEmailWebhookEnabled, setNewAdEmailWebhookEnabled] = useState(true);
  const [newAdEmailFromAddress, setNewAdEmailFromAddress] = useState("noreply@example.com");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpPassConfigured, setSmtpPassConfigured] = useState(false);
  const [smtpReady, setSmtpReady] = useState(false);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [webhookLines, setWebhookLines] = useState("");
  const [newAdEmailWebhookSecret, setNewAdEmailWebhookSecret] = useState("");
  const [message, setMessage] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testLog, setTestLog] = useState("");
  const [testTo, setTestTo] = useState("noreply@example.com");
  const [testSmtpLog, setTestSmtpLog] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings", { credentials: "include", cache: "no-store" });
    const data = await r.json();
    if (!r.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Ayarlar yuklenemedi.");
      return;
    }
    setNewAdEmailAutoEnabled(Boolean(data.newAdEmailAutoEnabled));
    setNewAdEmailWebhookEnabled(
      data.newAdEmailWebhookEnabled === undefined ? true : Boolean(data.newAdEmailWebhookEnabled),
    );
    setNewAdEmailFromAddress(String(data.newAdEmailFromAddress || "noreply@example.com"));
    setSmtpHost(String(data.smtpHost || ""));
    setSmtpPort(typeof data.smtpPort === "number" && data.smtpPort > 0 ? data.smtpPort : 587);
    setSmtpUser(String(data.smtpUser || ""));
    setSmtpPass("");
    setSmtpPassConfigured(Boolean(data.smtpPassConfigured));
    setSmtpReady(Boolean(data.smtpReady));
    setSmtpSecure(Boolean(data.smtpSecure));
    setTestTo(String(data.newAdEmailFromAddress || "noreply@example.com"));
    const raw = String(data.newAdEmailWebhookUrlsJson || "[]");
    const list = filterAllowedWebhookUrls(parseNewAdEmailWebhookUrls(raw));
    setWebhookLines(list.join("\n"));
    setNewAdEmailWebhookSecret(String(data.newAdEmailWebhookSecret || ""));
  }, []);

  useEffect(() => {
    // İlk yükleme: fetch tamamlandıktan sonra setState uygulanır (senkron setState değil).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API'den form state hidrasyonu
    void load();
  }, [load]);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const urls = filterAllowedWebhookUrls(
      webhookLines
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    );
    const body: Record<string, unknown> = {
      newAdEmailAutoEnabled,
      newAdEmailWebhookEnabled,
      newAdEmailFromAddress: newAdEmailFromAddress.trim(),
      newAdEmailWebhookUrlsJson: stringifyNewAdEmailWebhookUrls(urls),
      newAdEmailWebhookSecret: newAdEmailWebhookSecret,
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort) || 587,
      smtpUser: smtpUser.trim(),
      smtpSecure,
    };
    if (smtpPass.trim().length > 0) {
      body.smtpPass = smtpPass;
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      error?: unknown;
      details?: string;
      settings?: { smtpPassConfigured?: boolean; smtpReady?: boolean };
    };
    if (res.ok) {
      setSmtpPass("");
      setMessage(
        "Ayarlar kaydedildi. SMTP sifresi guvenlik icin bu kutuda tekrar gosterilmez; asagidaki durum satiri sunucudan guncellenir.",
      );
      await load();
    } else {
      const errText =
        typeof data.error === "string"
          ? data.error
          : `Kayit hatasi (${res.status}): ${JSON.stringify(data.error ?? data)}`;
      setMessage(
        data.details
          ? `${errText} — ${String(data.details).slice(0, 400)}`
          : errText,
      );
    }
  }

  async function onTestWebhook() {
    setTestLog("");
    const res = await fetch("/api/admin/new-ad-email/test-webhook", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        testUrl.trim() ? { url: testUrl.trim() } : {},
      ),
    });
    const data = await res.json();
    setTestLog(JSON.stringify(data, null, 2));
  }

  async function onTestSmtp() {
    setTestSmtpLog("");
    const res = await fetch("/api/admin/ilan-eposta/test-smtp", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        testTo.trim() ? { to: testTo.trim() } : {},
      ),
    });
    const data = await res.json();
    setTestSmtpLog(JSON.stringify(data, null, 2));
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href={adminUrl()}>
        ← Yönetici ana panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-orange-950">Yeni ilan bildirimleri</h1>
      <p className="text-sm leading-relaxed text-slate-800">
        İlan yönetici onayından (<strong>APPROVED</strong>) sonra tetiklenir. Üye e-postaları: aynı il + meslek, kayıtlı
        tercih ve onaylı üyelere gider. Harici entegrasyonlar için URL’lere <code className="rounded bg-slate-100 px-1">ad.approved</code>{" "}
        olayı POST edilir.
      </p>

      <form className="glass-card space-y-4 rounded-2xl p-5" onSubmit={onSave}>
        <h2 className="text-base font-bold text-orange-950">SMTP (e-posta sunucusu)</h2>
        <p className="text-sm text-slate-600">
          Aşağıdaki alanlar dolduğunda uygulama <strong>öncelikle panel</strong> ayarlarını kullanır; boş bırakıp yalnızca
          .env (<code className="rounded bg-slate-100 px-1">SMTP_HOST</code> vb.) bırakırsanız ortam değişkenleri
          yedek kalır. Gönderen adresi: test için <strong>noreply@example.com</strong> — istediğiniz adresi yazar
          kaydederseniz o kullanılır.
        </p>
        <p
          className={`text-sm font-medium ${smtpReady ? "text-emerald-800" : "text-amber-800"}`}
          role="status"
        >
          {smtpReady
            ? "SMTP kullanıma hazır (panel veya .env)."
            : "Henüz gönderim yok: panelde host + kullanıcı + şifre (şifre yalnızca .env SMTP_PASS olabilir) veya tam .env SMTP_* tanımlayın."}
        </p>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Gönderen (From) e-posta</label>
          <input
            className="w-full rounded-lg border p-2 bg-white"
            value={newAdEmailFromAddress}
            onChange={(e) => setNewAdEmailFromAddress(e.target.value)}
            placeholder="noreply@example.com"
            type="email"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">SMTP sunucusu (host)</label>
          <input
            className="w-full rounded-lg border p-2 bg-white"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            placeholder="smtp.gmail.com"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Port</label>
            <input
              className="w-full rounded-lg border p-2 bg-white"
              value={String(smtpPort)}
              onChange={(e) => setSmtpPort(Number.parseInt(e.target.value, 10) || 587)}
              type="number"
              min={1}
              max={65535}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            SSL/TLS (genelde 465; Gmail’de 587 + STARTTLS yeter, kapalı bırakın)
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">SMTP kullanıcı (genelde e-posta)</label>
          <input
            className="w-full rounded-lg border p-2 bg-white"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder="noreply@example.com"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="smtp-pass-input">
            SMTP şifre / uygulama şifresi
            {smtpPassConfigured ? (
              <span className="ml-2 font-normal text-emerald-700">(sunucuda kayıtlı; değiştirmek için yeni yazın)</span>
            ) : null}
          </label>
          <input
            id="smtp-pass-input"
            className="w-full rounded-lg border p-2 bg-white"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
            placeholder={
              smtpPassConfigured
                ? "Bos birakilirsa mevcut sifre korunur; yeni sifre icin yazin"
                : "Gmail: Uygulama sifresi onerilir"
            }
            type="password"
            autoComplete="new-password"
            aria-describedby="smtp-pass-help"
          />
        </div>
        <p
          id="smtp-pass-help"
          className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed text-slate-700"
        >
          <strong>Şifre kutusu:</strong> «Kaydet» sonrası güvenlik için her zaman boşalır; değer veritabanında kalır.
          Durum — SMTP şifresi:{" "}
          <strong className={smtpPassConfigured ? "text-emerald-800" : "text-amber-900"}>
            {smtpPassConfigured ? "kayıtlı" : "kayıtlı değil"}
          </strong>
          . Gönderim hazırlığı:{" "}
          <strong className={smtpReady ? "text-emerald-800" : "text-amber-900"}>{smtpReady ? "tamam" : "eksik"}</strong>.
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          Gmail: 2 adımlı doğrulama açıkken Google Hesabı → Güvenlik → Uygulama şifreleri. Port 587, SSL kutusu
          genelde kapalı.
        </p>

        <hr className="border-slate-200" />
        <h2 className="text-base font-bold text-orange-950">Bildirim kuralları</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={newAdEmailAutoEnabled}
              onChange={(e) => setNewAdEmailAutoEnabled(e.target.checked)}
            />
            Eşleşen üyelere otomatik e-posta
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={newAdEmailWebhookEnabled}
              onChange={(e) => setNewAdEmailWebhookEnabled(e.target.checked)}
            />
            Webhook (API) çağrıları — kayıtlı URL’lere JSON POST
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Webhook URL’leri (her satıra bir, https)</label>
          <textarea
            className="min-h-[120px] w-full rounded-lg border p-2 font-mono text-sm bg-white"
            value={webhookLines}
            onChange={(e) => setWebhookLines(e.target.value)}
            placeholder={"https://ornek.com/api/ilan-bildirim\nhttps://zapier.com/hooks/..."}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Webhook paylaşılan gizli (Bearer)</label>
          <input
            className="w-full rounded-lg border p-2 bg-white"
            value={newAdEmailWebhookSecret}
            onChange={(e) => setNewAdEmailWebhookSecret(e.target.value)}
            type="password"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="submit">
            Kaydet
          </button>
        </div>
        {message ? <p className="text-sm text-slate-800">{message}</p> : null}
      </form>

      <section className="glass-card space-y-3 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-orange-950">SMTP testi</h2>
        <p className="text-sm text-slate-600">Kayıtlı ayarlarla kısa bir e-posta gönderir. Alıcı (boşsa gönderen adresi).</p>
        <input
          className="w-full rounded-lg border p-2 bg-white"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="noreply@example.com"
          type="email"
        />
        <button type="button" className="btn-primary" onClick={() => void onTestSmtp()}>
          Test e-postası gönder
        </button>
        {testSmtpLog ? (
          <pre className="max-h-64 overflow-auto rounded border bg-slate-50 p-2 text-xs">{testSmtpLog}</pre>
        ) : null}
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-orange-950">Webhook testi</h2>
        <p className="text-sm text-slate-600">
          İsteğe bağlı tek URL (boşsa listedeki ilk adrese test gönderir). Sunucu yanıtı aşağıda.
        </p>
        <input
          className="w-full rounded-lg border p-2 bg-white"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          placeholder="https://... (opsiyonel)"
        />
        <button type="button" className="btn-primary" onClick={() => void onTestWebhook()}>
          Test POST gönder
        </button>
        {testLog ? (
          <pre className="max-h-64 overflow-auto rounded border bg-slate-50 p-2 text-xs">{testLog}</pre>
        ) : null}
      </section>

      <section className="glass-card space-y-2 rounded-2xl p-5 text-sm">
        <h2 className="text-lg font-semibold text-orange-950">ad.approved gövdesi (örnek)</h2>
        <p className="text-slate-600">Gerçek onayda üye e-postaları ve webhook aynı olayda üretilen payloaddır.</p>
        <pre className="max-h-96 overflow-auto rounded border bg-slate-50 p-3 text-xs leading-relaxed">
{JSON.stringify(
  {
    event: "ad.approved" satisfies NewAdApprovedWebhookPayload["event"],
    at: "2026-01-01T12:00:00.000Z",
    ad: {
      id: "…",
      listingNumber: 1001,
      title: "Ornek",
      titleDisplay: "Ornek",
      description: "…",
      province: "Istanbul",
      city: "Istanbul",
      district: "Kadikoy",
      professionId: "…",
      professionName: "Insaat muhendisligi",
      ownerId: "…",
      approvedAt: "2026-01-01T12:00:00.000Z",
    },
    matchedMembers: [{ userId: "…", email: "uye@ornek.com" }],
    emailDelivery: { memberEmailsEnabled: true, attempted: 1, smtpNotConfigured: false },
  } as NewAdApprovedWebhookPayload,
  null,
  2,
)}
        </pre>
        <p className="text-xs text-slate-500">
          Test: <code className="rounded bg-slate-100 px-1">POST /api/admin/new-ad-email/test-webhook</code> — <code>test: true</code> alanı İçerir.
        </p>
      </section>
    </main>
  );
}
