"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import {
  ILETI_MERKEZI_ENV_PASS,
  ILETI_MERKEZI_ENV_SENDER,
  ILETI_MERKEZI_ENV_USER,
} from "@/lib/iletMerkeziEnvNames";

type Feedback = { kind: "ok" | "err"; text: string } | null;

const LOAD_TIMEOUT_MS = 25_000;

export default function IletiMerkeziJsonClient() {
  const [iletiMerkeziUser, setIletiMerkeziUser] = useState("");
  const [iletiMerkeziPass, setIletiMerkeziPass] = useState("");
  const [iletiMerkeziSender, setIletiMerkeziSender] = useState("");
  const [hasIletiMerkeziPass, setHasIletiMerkeziPass] = useState(false);
  const [envUserSet, setEnvUserSet] = useState(false);
  const [envPassSet, setEnvPassSet] = useState(false);
  const [envSenderSet, setEnvSenderSet] = useState(false);
  const [hint, setHint] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Mühendisİlan: İleti Merkezi test SMS.");
  const [testBusy, setTestBusy] = useState(false);
  const [diagnoseBusy, setDiagnoseBusy] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);
  const [diagnoseOk, setDiagnoseOk] = useState<{
    credentialSource: string;
    senderHint: string;
    hashDiagnostics: {
      keyFingerprint: string;
      keyCharLength: number;
      secretCharLength: number;
      hashHexLength: number;
      hashPrefix8: string;
      algorithm: string;
    };
    hint: string;
  } | null>(null);
  const loadGen = useRef(0);

  const load = useCallback(async (): Promise<boolean> => {
    const g = ++loadGen.current;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), LOAD_TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch("/api/admin/ileti-merkezi-json", {
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
          ? `Ayarlar ${LOAD_TIMEOUT_MS / 1000} sn içinde yüklenemedi.`
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
    setIletiMerkeziUser(String(data.iletiMerkeziUser || ""));
    setIletiMerkeziPass("");
    setHasIletiMerkeziPass(Boolean(data.hasIletiMerkeziPass));
    setIletiMerkeziSender(String(data.iletiMerkeziSender || ""));
    setEnvUserSet(Boolean(data.envUserSet));
    setEnvPassSet(Boolean(data.envPassSet));
    setEnvSenderSet(Boolean(data.envSenderSet));
    setHint(typeof data.hint === "string" ? data.hint : "");
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
      iletiMerkeziUser: iletiMerkeziUser.trim(),
      iletiMerkeziSender: iletiMerkeziSender.trim(),
    };
    if (iletiMerkeziPass.trim().length > 0) {
      body.iletiMerkeziPass = iletiMerkeziPass.trim();
    }
    const res = await fetch("/api/admin/ileti-merkezi-json", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: unknown; detail?: unknown };
    if (!res.ok) {
      let errText = apiErrorMessage(data.error, "Kayıt başarısız.");
      const detail = typeof data.detail === "string" ? data.detail.trim() : "";
      if (detail && !errText.includes(detail.slice(0, 80))) {
        errText = `${errText} — ${detail}`;
      }
      setFeedback({ kind: "err", text: errText });
      return;
    }
    const reloaded = await load();
    if (reloaded) {
      setFeedback({ kind: "ok", text: "Kaydedildi." });
    } else {
      setFeedback({
        kind: "err",
        text: "Kayıt sunucuya yazıldı; form yenilenemedi. Sayfayı yenileyin.",
      });
    }
  }

  async function onDiagnose() {
    setDiagnoseBusy(true);
    setDiagnoseError(null);
    setDiagnoseOk(null);
    try {
      const res = await fetch("/api/admin/ileti-merkezi-json/diagnose", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: unknown;
        credentialSource?: string;
        senderHint?: string;
        hashDiagnostics?: {
          keyFingerprint: string;
          keyCharLength: number;
          secretCharLength: number;
          hashHexLength: number;
          hashPrefix8: string;
          algorithm: string;
        };
        hint?: string;
      };
      if (!res.ok) {
        setDiagnoseError(apiErrorMessage(data.error, "Hash teşhisi alınamadı."));
        return;
      }
      if (data.ok && data.hashDiagnostics) {
        setDiagnoseOk({
          credentialSource: String(data.credentialSource ?? ""),
          senderHint: String(data.senderHint ?? ""),
          hashDiagnostics: data.hashDiagnostics,
          hint: typeof data.hint === "string" ? data.hint : "",
        });
        return;
      }
      setDiagnoseError("Beklenmeyen yanıt.");
    } catch {
      setDiagnoseError("Hash teşhisi isteği gönderilemedi.");
    } finally {
      setDiagnoseBusy(false);
    }
  }

  async function onTest() {
    setTestBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/ileti-merkezi-json", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: "err", text: apiErrorMessage(data.error, "Test başarısız.") });
        return;
      }
      setFeedback({
        kind: "ok",
        text: typeof data.message === "string" ? data.message : "Test SMS gönderildi.",
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
        <Link href="/admin" className="chip">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">İleti Merkezi JSON SMS (genel)</h1>
      </div>
      <p className="text-sm text-slate-600">
        Kod: <code className="rounded bg-slate-100 px-1">sendIletiMerkeziJsonSms(phone, metin, {"{ prisma }"})</code> — panelde
        kullanıcı + şifre + gönderici doluysa veritabanı, değilse <code className="rounded bg-slate-100 px-1">{ILETI_MERKEZI_ENV_USER}</code>,{" "}
        <code className="rounded bg-slate-100 px-1">{ILETI_MERKEZI_ENV_PASS}</code>, <code className="rounded bg-slate-100 px-1">{ILETI_MERKEZI_ENV_SENDER}</code>{" "}
        ortam değişkenleri kullanılır.
      </p>
      {settingsReady && (
        <p className="text-xs text-slate-500">
          Env yedeği: {ILETI_MERKEZI_ENV_USER} {envUserSet ? "✓" : "—"} · {ILETI_MERKEZI_ENV_PASS} {envPassSet ? "✓" : "—"} · {ILETI_MERKEZI_ENV_SENDER}{" "}
          {envSenderSet ? "✓" : "—"}
        </p>
      )}
      {hint && <p className="text-xs text-slate-600">{hint}</p>}

      <form onSubmit={onSave} className="glass-card space-y-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800">Süper yönetici — panel bilgileri</h2>
        <p className="text-xs text-slate-500">
          İleti Merkezi panelindeki <strong className="text-slate-700">API anahtarı</strong> = kullanıcı, <strong className="text-slate-700">gizli anahtar</strong> = şifre
          (HMAC ile hash üretilir). Gönderici, hesabınızda onaylı başlık olmalıdır.
        </p>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Kullanıcı (API anahtarı)</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={iletiMerkeziUser}
            onChange={(e) => setIletiMerkeziUser(e.target.value)}
            autoComplete="off"
            placeholder="api_key…"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Şifre (gizli anahtar)</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            type="password"
            value={iletiMerkeziPass}
            onChange={(e) => setIletiMerkeziPass(e.target.value)}
            autoComplete="new-password"
            placeholder={hasIletiMerkeziPass ? "Değiştirmek için yeni değer girin" : "Gizli anahtar"}
          />
        </label>
        {hasIletiMerkeziPass && <p className="text-xs text-slate-500">Sunucuda şifre zaten kayıtlı; alanı boş bırakırsanız eski değer korunur.</p>}
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Gönderici (başlık)</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={iletiMerkeziSender}
            onChange={(e) => setIletiMerkeziSender(e.target.value)}
            autoComplete="off"
            placeholder="Onaylı gönderici adı"
          />
        </label>
        <button type="submit" className="btn-primary">
          Kaydet
        </button>
        {settingsReady && (iletiMerkeziUser.trim() || iletiMerkeziSender.trim()) && (
          <p className="text-xs text-slate-600" id="ileti-panel-loaded-hint">
            Kullanıcı ve gönderici alanları sunucudan yüklenir; kaydettikten sonra aynı değerler tekrar görünür. Şifre kutusu
            güvenlik için boş gösterilir — sunucuda kayıtlıysa yukarıdaki uyarı geçerlidir.
          </p>
        )}
      </form>

      {feedback && (
        <p
          className={
            feedback.kind === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          }
          role={feedback.kind === "err" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.text}
        </p>
      )}

      <div className="glass-card space-y-3 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800">Hash teşhisi (gizli yok)</h2>
        <p className="text-xs text-slate-600">
          Aynı API anahtarı + gizli anahtar ile dış HMAC-SHA256 aracında ürettiğiniz hex değerin ilk 8 karakteri{" "}
          <code className="rounded bg-slate-100 px-1">hashPrefix8</code> ile eşleşmelidir. Sunucu tam hash veya gizli
          anahtar göstermez.
        </p>
        <button
          type="button"
          className="chip"
          onClick={() => void onDiagnose()}
          disabled={diagnoseBusy}
        >
          {diagnoseBusy ? "Hesaplanıyor…" : "Hash teşhisi al"}
        </button>
        {diagnoseError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {diagnoseError}
          </p>
        )}
        {diagnoseOk && (
          <dl className="space-y-1 text-xs text-slate-700">
            <div>
              <dt className="font-medium text-slate-500">Kimlik kaynağı</dt>
              <dd>
                {diagnoseOk.credentialSource === "database"
                  ? "Panel (veritabanı)"
                  : diagnoseOk.credentialSource === "env"
                    ? "Ortam değişkeni"
                    : diagnoseOk.credentialSource || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Gönderici (ipucu)</dt>
              <dd className="font-mono">{diagnoseOk.senderHint || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">API anahtarı (ipucu)</dt>
              <dd className="font-mono">{diagnoseOk.hashDiagnostics.keyFingerprint}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Uzunluklar (key / gizli / hex hash)</dt>
              <dd>
                {diagnoseOk.hashDiagnostics.keyCharLength} / {diagnoseOk.hashDiagnostics.secretCharLength} /{" "}
                {diagnoseOk.hashDiagnostics.hashHexLength}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">hashPrefix8</dt>
              <dd className="font-mono text-slate-900">{diagnoseOk.hashDiagnostics.hashPrefix8}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Algoritma</dt>
              <dd className="text-slate-600">{diagnoseOk.hashDiagnostics.algorithm}</dd>
            </div>
            {diagnoseOk.hint && <p className="pt-1 text-slate-600">{diagnoseOk.hint}</p>}
          </dl>
        )}
      </div>

      <div className="glass-card space-y-3 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800">Test gönder</h2>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Telefon</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+905551234567 veya 0555…"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Mesaj</span>
          <textarea
            className="mt-1 min-h-[5rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
          />
        </label>
        <button type="button" className="chip" onClick={() => void onTest()} disabled={testBusy || !testPhone.trim()}>
          {testBusy ? "Gönderiliyor…" : "Test SMS gönder"}
        </button>
      </div>
    </main>
  );
}
