"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import AdminGateDevHint from "./admin-gate-dev-hint";
import AdminMfaPanel from "./admin-mfa-panel";
import AdminPasswordForm from "./admin-password-form";
import SuperAdminLoginForm from "./super-admin-login-form";

type MfaState = { email: string; needsEnrollment: boolean };

export default function AdminGateLoginLayout({
  initialMfa,
  devHints,
}: {
  initialMfa: MfaState | null;
  devHints: { email: string | null; password: string | null };
}) {
  const [mfa, setMfa] = useState<MfaState | null>(initialMfa);

  useEffect(() => {
    setMfa(initialMfa);
  }, [initialMfa]);

  useEffect(() => {
    if (!mfa) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mfa]);

  async function closeMfaModal() {
    try {
      await fetch("/api/auth/admin-mfa/abort", { method: "POST", credentials: "include" });
    } finally {
      setMfa(null);
    }
  }

  return (
    <>
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-10">
        <div className="admin-hero mb-6 rounded-2xl px-6 py-8 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-100">Mühendisİlan</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Yönetici girişi</h1>
          <p className="mt-3 text-sm text-orange-50/95">
            Önce şifre ile doğrulama; ardından <strong className="text-white">Authenticator (TOTP)</strong> kodu
            gerekir. Sol kartta süper yönetici hesap şifresi veya yönetici{" "}
            <strong className="text-white">e-posta + şifre</strong>; sağda rol özeti.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card flex flex-col rounded-2xl p-6 shadow-lg">
            <h2 className="border-b border-orange-200/80 pb-2 text-sm font-semibold text-orange-950">
              Süper yönetici şifresi
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              <code className="rounded bg-orange-50 px-1">SUPER_ADMIN</code> rolündeki hesabın giriş şifresi (üye
              oturumu açılır; ortam değişkeni değil, veritabanındaki şifre).
            </p>
            <div className="mt-4">
              <Suspense fallback={<p className="text-sm text-slate-500">Yükleniyor…</p>}>
                <AdminPasswordForm />
              </Suspense>
            </div>

            <div className="my-5 border-t border-orange-200/80 pt-5">
              <h3 className="text-sm font-semibold text-orange-950">E-posta ve şifre (yönetici hesabı)</h3>
              <p className="mt-1.5 text-xs text-slate-600">
                <code className="rounded bg-orange-50 px-1">ADMIN</code> veya{" "}
                <code className="rounded bg-orange-50 px-1">SUPER_ADMIN</code> rolü ile üye girişi; panel şifresi
                gerekmez.
              </p>
              {process.env.NODE_ENV === "development" ? (
                <div className="mt-3">
                  <AdminGateDevHint email={devHints.email} password={devHints.password} />
                </div>
              ) : null}
              <div className="mt-3">
                <SuperAdminLoginForm
                  defaultEmail={devHints.email ?? ""}
                  defaultPassword={devHints.password ?? ""}
                  onAdminMfa={(info) => setMfa(info)}
                />
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col rounded-2xl p-6 shadow-lg ring-2 ring-amber-400/40">
            <h2 className="border-b border-amber-300/80 pb-2 text-sm font-semibold text-amber-950">
              Yönetici türleri
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-800">İki aşama:</strong> Şifre doğrulandıktan sonra Authenticator ile 6
              haneli kod (ilk girişte QR ile kurulum).{" "}
              <strong className="text-slate-800">Süper şifre / e-posta:</strong> Veritabanındaki yönetici hesabı;
              roller panele göre modülleri açar.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-4 text-xs text-slate-600">
              <li>
                <code className="rounded bg-amber-50 px-1">SUPER_ADMIN</code> — Ekip/alt yönetici yönetimi
              </li>
              <li>
                <code className="rounded bg-amber-50 px-1">ADMIN</code> — Yardımcı yönetici, çoğu modül
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Parolayı unuttuysanız: ortam/veritabanı yöneticisi veya seed/süper yönetici üzerinden sıfırlanır.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/" className="font-medium text-orange-700 hover:text-orange-900 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </p>
      </main>

      {mfa ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Authenticator penceresini kapat"
            onClick={() => void closeMfaModal()}
          />
          <div className="relative z-[301] max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto bg-white px-5 py-8 sm:px-8">
            <AdminMfaPanel
              email={mfa.email}
              needsEnrollment={mfa.needsEnrollment}
              onNavigateBack={() => setMfa(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
