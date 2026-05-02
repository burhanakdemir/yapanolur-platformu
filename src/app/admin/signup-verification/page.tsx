"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";

export default function SignupVerificationAdminPage() {
  const [emailRequired, setEmailRequired] = useState(true);
  const [phoneRequired, setPhoneRequired] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.signupEmailVerificationRequired === "boolean") {
          setEmailRequired(data.signupEmailVerificationRequired);
        }
        if (typeof data.signupPhoneVerificationRequired === "boolean") {
          setPhoneRequired(data.signupPhoneVerificationRequired);
        }
      })
      .catch(() => setMessage("Ayarlar yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        signupEmailVerificationRequired: emailRequired,
        signupPhoneVerificationRequired: phoneRequired,
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok ? "Kayıt doğrulama ayarları kaydedildi." : data.error || "Kayıt başarısız.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href={adminUrl()}>
        ← Yönetici ana panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-orange-950">Üye kaydı doğrulama</h1>
      <p className="text-sm text-slate-700">
        E-posta ve telefon OTP adımlarını kapatırsanız{" "}
        <code className="rounded bg-slate-100 px-1">/members</code> kayıt formu doğrulama olmadan
        tamamlanabilir (demo / geliştirme). Kapalıyken spam ve sahte kayıt riski artar; üretimde her
        ikisini de açık tutun.
      </p>

      {loading ? (
        <p className="text-sm text-slate-600">Yükleniyor…</p>
      ) : (
        <form className="glass-card rounded-2xl p-5 space-y-4" onSubmit={onSave}>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={emailRequired}
              onChange={(e) => setEmailRequired(e.target.checked)}
            />
            <span>
              <span className="font-medium text-slate-900">E-posta doğrulama (OTP) zorunlu</span>
              <span className="mt-1 block text-sm text-slate-600">
                Kapalı: kayıtta e-posta kanıt çerezi ve OTP istenmez; adres yine benzersiz ve geçerli
                format olmalıdır.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={phoneRequired}
              onChange={(e) => setPhoneRequired(e.target.checked)}
            />
            <span>
              <span className="font-medium text-slate-900">Cep telefonu doğrulama (SMS OTP) zorunlu</span>
              <span className="mt-1 block text-sm text-slate-600">
                Kapalı: telefon doğrulaması ve SMS istenmez; telefon alanı isteğe bağlıdır (boş
                bırakılabilir).
              </span>
            </span>
          </label>

          <button className="btn-primary" type="submit">
            Kaydet
          </button>
          {message && <p className="text-sm">{message}</p>}
        </form>
      )}
    </main>
  );
}
