"use client";

import { FormEvent, useState } from "react";
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

export default function UserPanelPasswordActions({
  lang,
  labels,
}: {
  lang: "tr" | "en";
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
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

  function closePanel() {
    setOpen(false);
    resetForm();
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

  return (
    <div className="flex w-full min-w-[9.5rem] flex-col gap-2 self-center sm:w-auto sm:self-start">
      <button
        type="button"
        className={heroBtnClass}
        aria-expanded={open}
        onClick={() => {
          if (open) closePanel();
          else {
            resetForm();
            setOpen(true);
          }
        }}
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

      {open ? (
        <div
          className="w-full min-w-[14rem] max-w-xs rounded-lg border border-white/40 bg-black/20 p-3 text-left backdrop-blur-sm sm:max-w-sm"
          role="region"
          aria-label={labels.changePassword}
        >
          <form className="space-y-2" onSubmit={onVerifyOld}>
            <label className="block text-[11px] font-medium text-orange-50" htmlFor="panel-old-pw">
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
              className="w-full rounded-md border border-white/30 bg-white/95 px-2 py-1.5 text-sm text-slate-900"
            />
            {!oldVerified ? (
              <button
                type="submit"
                disabled={verifyLoading || !currentPassword.trim()}
                className="w-full rounded-md border border-white/50 bg-white/20 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/30 disabled:opacity-50"
              >
                {verifyLoading ? labels.verifying : labels.verifyOld}
              </button>
            ) : null}
          </form>

          {oldVerified ? (
            <form className="mt-2 space-y-2 border-t border-white/25 pt-2" onSubmit={onSaveNew}>
              <label className="block text-[11px] font-medium text-orange-50" htmlFor="panel-new-pw">
                {labels.newPassword}
              </label>
              <input
                id="panel-new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-white/30 bg-white/95 px-2 py-1.5 text-sm text-slate-900"
              />
              <label className="block text-[11px] font-medium text-orange-50" htmlFor="panel-confirm-pw">
                {labels.confirmPassword}
              </label>
              <input
                id="panel-confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-white/30 bg-white/95 px-2 py-1.5 text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={saveLoading}
                className="w-full rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                {saveLoading ? labels.saving : labels.savePassword}
              </button>
            </form>
          ) : null}

          <div className="mt-2 border-t border-white/25 pt-2">
            <button
              type="button"
              disabled={resetLoading}
              onClick={() => void onAutoReset()}
              className="w-full rounded-md border border-amber-200/80 bg-amber-500/90 px-2 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {resetLoading ? labels.resetting : labels.autoReset}
            </button>
          </div>

          {message ? (
            <p
              className={`mt-2 text-[11px] leading-snug ${messageOk ? "text-emerald-100" : "text-amber-100"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-2 w-full text-[11px] text-white/80 underline-offset-2 hover:text-white hover:underline"
            onClick={closePanel}
          >
            {labels.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}
