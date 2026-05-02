"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { adminUrl } from "@/lib/adminUrls";

type MfaJson = {
  error?: unknown;
  qrDataUrl?: string | null;
  sessionExpired?: boolean;
};

export default function AdminMfaPanel({
  email,
  needsEnrollment,
  onNavigateBack,
}: {
  email: string;
  needsEnrollment: boolean;
  /** Modal modunda: tam sayfa yenileme yerine şifre ekranına dönüş (abort çağrısı dahil). */
  onNavigateBack?: () => void;
}) {
  async function returnToLoginPanel(): Promise<void> {
    try {
      await fetch("/api/auth/admin-mfa/abort", { method: "POST", credentials: "include" });
    } finally {
      if (onNavigateBack) {
        onNavigateBack();
      } else {
        window.location.assign(adminUrl());
      }
    }
  }

  async function reloadAfterSessionExpired(): Promise<void> {
    try {
      await fetch("/api/auth/admin-mfa/abort", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    window.location.assign(adminUrl());
  }
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enrollReady, setEnrollReady] = useState(!needsEnrollment);
  const [lostAuthOpen, setLostAuthOpen] = useState(false);
  const [lostPassword, setLostPassword] = useState("");
  const [lostMessage, setLostMessage] = useState("");

  useEffect(() => {
    if (!needsEnrollment) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/admin-totp/enrollment/start", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as MfaJson;
        if (!res.ok) {
          if (data.sessionExpired) {
            await reloadAfterSessionExpired();
            return;
          }
          setMessage(apiErrorMessage(data.error, "Kurulum başlatılamadı."));
          return;
        }
        if (cancelled) return;
        if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
        setEnrollReady(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsEnrollment]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length < 6) {
      setMessage("6 haneli kodu girin.");
      return;
    }
    setLoading(true);
    try {
      const path = needsEnrollment
        ? "/api/auth/admin-totp/enrollment/verify"
        : "/api/auth/admin-totp/verify";
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as MfaJson;
      if (!res.ok) {
        if (data.sessionExpired) {
          await reloadAfterSessionExpired();
          return;
        }
        setMessage(apiErrorMessage(data.error, "Doğrulama başarısız."));
        return;
      }
      window.location.assign(adminUrl());
    } finally {
      setLoading(false);
    }
  }

  async function onLostDeviceReset(e: FormEvent) {
    e.preventDefault();
    setLostMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-totp/lost-device-reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: lostPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as MfaJson;
      if (!res.ok) {
        if (data.sessionExpired) {
          await reloadAfterSessionExpired();
          return;
        }
        setLostMessage(apiErrorMessage(data.error, "İşlem başarısız."));
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-full">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-900/70">İki aşamalı doğrulama</p>
      <h1 className="mt-2 text-xl font-bold text-orange-950">Authenticator kodu</h1>
      <p className="mt-2 text-sm text-slate-600">
        Hesap: <strong className="text-slate-800">{email}</strong>
      </p>
      {needsEnrollment ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Google Authenticator veya uyumlu bir uygulama ile QR kodu tarayın; ardından üretilen 6 haneli kodu girin.
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-600">Authenticator uygulamanızdaki 6 haneli kodu girin.</p>
      )}

      {needsEnrollment && qrDataUrl ? (
        <div className="mt-4 flex justify-center rounded-xl border border-orange-100 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR kod" width={220} height={220} className="max-w-full" />
        </div>
      ) : null}
      {needsEnrollment && loading && !qrDataUrl ? (
        <p className="mt-4 text-sm text-slate-500" aria-live="polite">
          QR kod hazırlanıyor…
        </p>
      ) : null}

      <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-sm font-medium text-slate-700">
          Doğrulama kodu
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-center font-mono text-lg tabular-nums tracking-[0.35em] text-slate-900 outline-none ring-orange-200 focus:ring-2 sm:tracking-[0.45em]"
            disabled={loading || (needsEnrollment && !enrollReady)}
            maxLength={8}
          />
        </label>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
        <button
          type="submit"
          disabled={loading || (needsEnrollment && !enrollReady)}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? "…" : "Doğrula ve panele gir"}
        </button>
      </form>

      {!needsEnrollment ? (
        <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setLostAuthOpen((o) => !o);
              setLostMessage("");
            }}
            className="text-left text-sm font-medium text-amber-950 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Authenticator kaydını sildim veya telefonu kaybettim
          </button>
          {lostAuthOpen ? (
            <form className="mt-3 space-y-2" onSubmit={(e) => void onLostDeviceReset(e)}>
              <p className="text-xs leading-relaxed text-slate-600">
                Bu hesabın veritabanındaki <strong className="text-slate-800">giriş şifresini</strong> tekrar girin;
                TOTP sıfırlanır ve yeni QR kodu gösterilir.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Hesap şifresi
                <input
                  type="password"
                  autoComplete="current-password"
                  value={lostPassword}
                  onChange={(e) => setLostPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none ring-orange-200 focus:ring-2"
                  disabled={loading}
                  required
                />
              </label>
              {lostMessage ? <p className="text-sm text-red-600">{lostMessage}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border border-amber-700/40 bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100/80 disabled:opacity-60"
              >
                {loading ? "…" : "TOTP sıfırla ve yeni QR göster"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 border-t border-orange-100 pt-4 text-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => void returnToLoginPanel()}
          className="text-sm font-medium text-orange-800 underline-offset-2 hover:text-orange-950 hover:underline disabled:opacity-50"
        >
          Şifre girişine dön
        </button>
      </p>
    </div>
  );
}
