"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { sanitizePublicNextPath } from "@/lib/safeRedirectPath";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";

type LoginClientProps = {
  nextPath: string;
  /** URL'de ?next= verildiyse baska sayfaya yonlendirilir; verilmediyse rol ile secilir. */
  explicitNext: boolean;
};

export default function LoginClient({ nextPath, explicitNext }: LoginClientProps) {
  const [message, setMessage] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

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
    window.location.assign(sanitizePublicNextPath(target));
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-5 sm:px-6">
      <section className="glass-card space-y-2 rounded-2xl p-4">
      <h1 className="text-2xl font-bold tracking-tight">Giris Yap</h1>
      <form className="space-y-2" onSubmit={onSubmit}>
        <input
          ref={emailInputRef}
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
          placeholder="E-posta"
          required
        />
        <input
          name="password"
          type="password"
          className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
          placeholder="Sifre"
          required
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm font-medium text-orange-700 underline-offset-2 hover:underline"
            onClick={() => {
              setForgotEmail(emailInputRef.current?.value.trim().toLowerCase() ?? "");
              setForgotOpen(true);
            }}
          >
            Şifremi unuttum
          </button>
        </div>
        <button className="btn-primary w-full" type="submit">
          Giris
        </button>
      </form>
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={forgotEmail}
      />
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
