"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

export default function AdminPasswordForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const apiUrl = new URL("/api/admin/gate", window.location.origin).toString();
      const res = await fetch(apiUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(data.error, "Gecersiz sifre."));
        return;
      }
      const dest = nextPath.startsWith("/") ? nextPath : "/admin";
      /** Tam sayfa geçişi: LAN (http://IP) ve App Router’da Set-Cookie sonrası client yönlendirmesinin oturumu kaçırmasını önler. */
      window.location.assign(dest);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Süper yönetici şifresi
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none ring-orange-200 focus:ring-2"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-60"
      >
        {loading ? "..." : "Giris"}
      </button>
    </form>
  );
}
