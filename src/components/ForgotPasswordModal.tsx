"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatSignupOtpTtlTr } from "@/lib/signupOtpTtl";

type Props = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
};

export default function ForgotPasswordModal({ open, onClose, initialEmail = "" }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpTtlMinutes, setOtpTtlMinutes] = useState(2);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail.trim().toLowerCase());
      setCode("");
      setOtpSent(false);
      setMessage("");
    }
  }, [open, initialEmail]);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !panelRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const list = [...focusables].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
    document.addEventListener("keydown", trapFocus);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, trapFocus]);

  async function sendOtpRequest() {
    setMessage("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMessage("E-posta adresinizi girin.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(clientApiUrl("/api/auth/forgot-password/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        hint?: string;
        otpTtlMinutes?: number;
      };
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, "Kod gönderilemedi."));
        return;
      }
      const ttl =
        typeof data.otpTtlMinutes === "number" && data.otpTtlMinutes > 0
          ? Math.min(60, Math.floor(data.otpTtlMinutes))
          : 2;
      setOtpTtlMinutes(ttl);
      setOtpSent(true);
      setMessage(
        typeof data.hint === "string" && data.hint.trim()
          ? data.hint.trim()
          : "E-posta adresinize doğrulama kodu gönderildi.",
      );
    } catch {
      setMessage("İstek gönderilemedi. Ağ bağlantınızı kontrol edin.");
    } finally {
      setSending(false);
    }
  }

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    await sendOtpRequest();
  }

  async function onVerifyAndReset(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const trimmed = email.trim().toLowerCase();
    const otp = code.trim();
    if (!trimmed || otp.length < 4) {
      setMessage("E-posta ve 6 haneli kodu girin.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(clientApiUrl("/api/auth/forgot-password/verify-and-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, code: otp }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; message?: string };
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, "Şifre sıfırlama tamamlanamadı."));
        return;
      }
      setMessage(
        typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : "Yeni şifreniz e-posta adresinize gönderildi.",
      );
      setCode("");
    } catch {
      setMessage("İstek gönderilemedi. Ağ bağlantınızı kontrol edin.");
    } finally {
      setVerifying(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[86] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-lg font-bold text-white">
            Şifremi unuttum
          </h2>
        </div>
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-slate-600">
            Kayıtlı üye e-postanıza doğrulama kodu gönderilir. Kodu onayladıktan sonra geçici şifreniz e-posta ile
            iletilir.
          </p>
          {!otpSent ? (
            <form className="space-y-2" onSubmit={onRequestOtp}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="forgot-email">
                E-posta
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn-primary w-full" type="submit" disabled={sending}>
                {sending ? "Gönderiliyor…" : "Doğrulama kodu gönder"}
              </button>
            </form>
          ) : (
            <form className="space-y-2" onSubmit={onVerifyAndReset}>
              <p className="text-xs text-slate-500">
                Kod {formatSignupOtpTtlTr(otpTtlMinutes)} geçerlidir.
              </p>
              <label className="block text-sm font-medium text-slate-700" htmlFor="forgot-code">
                Doğrulama kodu (6 hane)
              </label>
              <input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-lg border px-2.5 py-1.5 text-sm tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
              />
              <button className="btn-primary w-full" type="submit" disabled={verifying}>
                {verifying ? "Doğrulanıyor…" : "Kodu doğrula ve şifre gönder"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-orange-700 underline-offset-2 hover:underline"
                disabled={sending}
                onClick={() => void sendOtpRequest()}
              >
                Kodu tekrar gönder
              </button>
            </form>
          )}
          {message && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800" role="alert">
              {message}
            </p>
          )}
          <button type="button" className="w-full text-sm text-slate-600 hover:text-slate-900" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
