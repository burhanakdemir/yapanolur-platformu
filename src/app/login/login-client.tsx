"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type LoginClientProps = {
  nextPath: string;
  /** URL'de ?next= verildiyse baska sayfaya yonlendirilir; verilmediyse rol ile secilir. */
  explicitNext: boolean;
};

export default function LoginClient({ nextPath, explicitNext }: LoginClientProps) {
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
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
    const data = await res.json();
    if (!res.ok) {
      setMessage(apiErrorMessage(data.error, "Giris basarisiz."));
      return;
    }
    const role = data.user?.role as string | undefined;
    let target = nextPath;
    if (!explicitNext) {
      target = isStaffAdminRole(role) ? adminUrl() : "/panel/user";
    }
    /** Tam sayfa yönlendirme: oturum çerezi middleware ile güvenilir şekilde taşınır (App Router). */
    window.location.assign(target.startsWith("/") ? target : `/${target}`);
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <section className="glass-card rounded-2xl p-6 space-y-4">
      <h1 className="text-3xl font-bold">Giris Yap</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input name="email" className="w-full border rounded-lg p-2" placeholder="E-posta" required />
        <input
          name="password"
          type="password"
          className="w-full border rounded-lg p-2"
          placeholder="Sifre"
          required
        />
        <button className="btn-primary w-full" type="submit">
          Giris
        </button>
      </form>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <p className="text-center text-sm text-slate-600">
        <Link href="/" className="font-medium text-orange-700 underline-offset-2 hover:underline">
          Ana sayfaya dön
        </Link>
      </p>
      </section>
    </main>
  );
}
