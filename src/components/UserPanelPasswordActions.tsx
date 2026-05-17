"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clientApiUrl } from "@/lib/clientApi";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type Labels = {
  changePassword: string;
  logout: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  verifyOld: string;
  savePassword: string;
  autoReset: string;
  close: string;
  verifying: string;
  saving: string;
  resetting: string;
  oldVerified: string;
  oldWrong: string;
  mismatch: string;
  saved: string;
  autoResetConfirm: string;
  autoResetDone: string;
};

const heroBtnClass =
  "inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/15 px-3 py-1.5 text-center text-xs font-semibold backdrop-blur transition hover:bg-white/25 sm:px-4 sm:py-2 sm:text-sm";

const inputClass =
  "w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200/80";

export default function UserPanelPasswordActions({
  lang,
  labels,
}: {
  lang: "tr" | "en";
  labels: Labels;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldVerified, setOldVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOldVerified(false);
    setMessage("");
    setMessageOk(false);
  }

  const closeModal = useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, []);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!modalOpen || !panelRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
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
    [modalOpen, closeModal],
  );

  useEffect(() => {
    if (!modalOpen) return;
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
  }, [modalOpen, trapFocus]);

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  async function onVerifyOld(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setMessageOk(false);
    if (!currentPassword.trim()) {
      setMessage(labels.oldWrong);
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch(clientApiUrl("/api/member-profile/password/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword: currentPassword.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        setOldVerified(false);
        setMessage(apiErrorMessage(data.error, labels.oldWrong));
        return;
      }
      setOldVerified(true);
      setMessageOk(true);
      setMessage(labels.oldVerified);
    } catch {
      setOldVerified(false);
      setMessage(labels.oldWrong);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function onSaveNew(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setMessageOk(false);
    if (!oldVerified) return;
    if (!newPassword || newPassword.length < 4) {
      setMessage(lang === "tr" ? "Yeni şifre en az 4 karakter olmalıdır." : "New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(labels.mismatch);
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch(clientApiUrl("/api/member-profile/password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, labels.oldWrong));
        return;
      }
      setMessageOk(true);
      setMessage(labels.saved);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOldVerified(false);
    } catch {
      setMessage(lang === "tr" ? "Şifre kaydedilemedi." : "Could not save password.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function onAutoReset() {
    if (!window.confirm(labels.autoResetConfirm)) return;
    setMessage("");
    setMessageOk(false);
    setResetLoading(true);
    try {
      const res = await fetch(clientApiUrl("/api/member-profile/password/auto-reset"), {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; message?: string };
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, labels.autoResetDone));
        return;
      }
      setMessageOk(true);
      setMessage(typeof data.message === "string" ? data.message : labels.autoResetDone);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOldVerified(false);
    } catch {
      setMessage(lang === "tr" ? "İstek başarısız." : "Request failed.");
    } finally {
      setResetLoading(false);
    }
  }

  async function onLogout() {
    setLogoutLoading(true);
    try {
      await fetch(clientApiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* yönlendirme yine de yapılır */
    } finally {
      window.location.assign(lang === "en" ? "/?lang=en" : "/");
    }
  }

  const passwordModal = modalOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label={labels.close}
        onClick={closeModal}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] w-full max-w-sm overflow-hidden rounded-2xl border border-orange-300/60 bg-white shadow-xl shadow-orange-900/15"
      >
        <div className="border-b border-white/25 bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="text-lg font-bold text-white">
              {labels.changePassword}
            </h2>
            <button
              type="button"
              className="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-xs font-semibold text-white hover:bg-white/25"
              onClick={closeModal}
            >
              {labels.close}
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <form className="space-y-2" onSubmit={onVerifyOld}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="panel-old-pw">
              {labels.oldPassword}
            </label>
            <input
              id="panel-old-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              disabled={oldVerified && !verifyLoading}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (oldVerified) {
                  setOldVerified(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }
              }}
              className={inputClass}
            />
            {!oldVerified ? (
              <button
                type="submit"
                disabled={verifyLoading || !currentPassword.trim()}
                className="btn-primary w-full text-sm disabled:opacity-50"
              >
                {verifyLoading ? labels.verifying : labels.verifyOld}
              </button>
            ) : null}
          </form>

          {oldVerified ? (
            <form className="space-y-2 border-t border-orange-100 pt-3" onSubmit={onSaveNew}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="panel-new-pw">
                {labels.newPassword}
              </label>
              <input
                id="panel-new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <label className="block text-sm font-medium text-slate-700" htmlFor="panel-confirm-pw">
                {labels.confirmPassword}
              </label>
              <input
                id="panel-confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={saveLoading} className="btn-primary w-full text-sm disabled:opacity-50">
                {saveLoading ? labels.saving : labels.savePassword}
              </button>
            </form>
          ) : null}

          <div className="border-t border-orange-100 pt-3">
            <button
              type="button"
              disabled={resetLoading}
              onClick={() => void onAutoReset()}
              className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 disabled:opacity-50"
            >
              {resetLoading ? labels.resetting : labels.autoReset}
            </button>
          </div>

          {message ? (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                messageOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex w-full min-w-[9.5rem] flex-col gap-2 self-center sm:w-auto sm:self-start">
        <button
          type="button"
          className={heroBtnClass}
          aria-haspopup="dialog"
          aria-expanded={modalOpen}
          onClick={openModal}
        >
          {labels.changePassword}
        </button>
        <button
          type="button"
          className={heroBtnClass}
          disabled={logoutLoading}
          onClick={() => void onLogout()}
        >
          {logoutLoading ? (lang === "tr" ? "Çıkış…" : "Signing out…") : labels.logout}
        </button>
      </div>
      {typeof document !== "undefined" && passwordModal
        ? createPortal(passwordModal, document.body)
        : null}
    </>
  );
}
