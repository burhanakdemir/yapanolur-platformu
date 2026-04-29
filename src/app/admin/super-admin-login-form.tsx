"use client";

import { FormEvent, useState } from "react";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type SuperAdminLoginFormProps = {
  /** Yerel geliştirme: formu önceden doldurmak için (opsiyonel) */
  defaultEmail?: string;
  defaultPassword?: string;
};

export default function SuperAdminLoginForm({
  defaultEmail = "",
  defaultPassword = "",
}: SuperAdminLoginFormProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, "Giriş başarısız."));
        return;
      }
      const role = data.user?.role as string | undefined;
      if (!isStaffAdminRole(role)) {
        setMessage("Bu hesap yönetici değil. Süper / yardımcı yönetici hesabı kullanın.");
        return;
      }
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        E-posta
        <input
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none ring-orange-200 focus:ring-2"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Şifre
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={defaultPassword}
          className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none ring-orange-200 focus:ring-2"
          required
        />
      </label>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-amber-800 to-orange-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:from-amber-900 hover:to-orange-950 disabled:opacity-60"
      >
        {loading ? "Giriş…" : "Süper / yardımcı yönetici olarak gir"}
      </button>
      <p className="text-center text-xs text-slate-500">
        <a href="/login" className="font-medium text-orange-700 hover:underline">
          Genel giriş sayfası →
        </a>
      </p>
    </form>
  );
}
