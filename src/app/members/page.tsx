"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { clientApiUrl } from "@/lib/clientApi";
import { dictionary, getLang, type Lang } from "@/lib/i18n";
import FileInputTr from "@/components/FileInputTr";
import { NewAdEmailOptInGradientBox } from "@/components/NewAdEmailOptInGradientBox";
import ProvinceDistrictSelect from "@/components/ProvinceDistrictSelect";
import ProfessionCombobox from "@/components/ProfessionCombobox";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { SIGNUP_EMAIL_OTP_REQUEST_PUBLIC_HINT_TR } from "@/lib/signupEmailOtpHint";
import { digitsOnly, isValidTcKimlik, isValidVknFormat } from "@/lib/trBillingIds";
import {
  flagEmoji,
  getCountryDialOptions,
  parseStoredPhone,
  tryFormatE164,
} from "@/lib/intlPhone";
import { getSafeInternalNextPath } from "@/lib/safeNextPath";
import HomeBackButtonLink, { homeBackPrimaryClassName } from "@/components/HomeBackButtonLink";
import { formatSignupOtpTtlTr } from "@/lib/signupOtpTtl";

function membersLoginHref(lang: Lang, nextPath: string): string {
  const q = new URLSearchParams();
  q.set("next", nextPath);
  if (lang === "en") q.set("lang", "en");
  return `/login?${q.toString()}`;
}

const signupEmailFieldSchema = z.string().trim().toLowerCase().pipe(z.string().email());

function formatOtpMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function uploadImage(file: File) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const payload = result.includes(",") ? result.split(",")[1] : result;
      resolve(payload);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const res = await fetch(clientApiUrl("/api/uploads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ filename, dataBase64: base64 }),
  });
  const data = (await res.json()) as { url?: string; error?: string; code?: string };
  if (!res.ok || !data?.url) {
    const msg =
      data?.code === "storage_config"
        ? "Dosya sunucusu yapılandırılmamış. Yöneticiye iletin (S3/storage)."
        : (data?.error || "Dosya yüklenemedi.");
    throw new Error(msg);
  }
  return String(data.url);
}

export default function MembersPage() {
  return <MembersPageContent />;
}

function MembersPageContent() {
  const [lang, setLang] = useState<Lang>("tr");
  /** Sunucu SIGNUP_OTP_TTL_MINUTES ile uyumlu; API yanıtındaki otpTtlMinutes ile güncellenir. */
  const [signupOtpTtlMinutes, setSignupOtpTtlMinutes] = useState(2);
  /** null: henüz /api/register/options yüklenmedi — güvenli varsayılan OTP zorunlu. */
  const [signupEmailRequired, setSignupEmailRequired] = useState<boolean | null>(null);
  const [signupPhoneRequired, setSignupPhoneRequired] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savedProfile, setSavedProfile] = useState<{
    memberNumber: number;
    email: string;
    name: string | null;
    profilePhotoUrl: string | null;
    memberProfile: {
      phone: string | null;
      province: string | null;
      district: string | null;
      professionId: string | null;
      profession: { id: string; name: string } | null;
      documents: { id: string; type: string; fileUrl: string }[];
      billingAccountType?: "INDIVIDUAL" | "CORPORATE";
      billingTcKimlik?: string | null;
      billingCompanyTitle?: string | null;
      billingTaxOffice?: string | null;
      billingVkn?: string | null;
      billingAddressLine?: string | null;
      billingPostalCode?: string | null;
    };
  } | null>(null);
  const [professions, setProfessions] = useState<{ id: string; name: string }[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [readonlyDocFiles, setReadonlyDocFiles] = useState<{
    diploma?: File;
    engineering?: File;
    tax?: File;
  }>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  /** Kayit API yaniti; oturum acilmadan once gosterim */
  const [pendingMemberNumber, setPendingMemberNumber] = useState<number | null>(null);
  const [otpEmailSending, setOtpEmailSending] = useState(false);
  const [otpPhoneSending, setOtpPhoneSending] = useState(false);
  /** Kayıt formu: bireysel / kurumsal fatura tipi */
  const [billingAccountType, setBillingAccountType] = useState<"INDIVIDUAL" | "CORPORATE">("INDIVIDUAL");
  const [regEmail, setRegEmail] = useState("");
  const [regEmailError, setRegEmailError] = useState("");
  const [phoneCountryIso, setPhoneCountryIso] = useState<CountryCode>("TR");
  const [phoneNational, setPhoneNational] = useState("");
  const [phoneFieldError, setPhoneFieldError] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpPhoneVerifyLoading, setOtpPhoneVerifyLoading] = useState(false);
  /** Başarılı «kod gönder» sonrası kalan saniye (0 = sayaç kapalı). */
  const [emailOtpSecondsLeft, setEmailOtpSecondsLeft] = useState(0);
  const [phoneOtpSecondsLeft, setPhoneOtpSecondsLeft] = useState(0);
  /** Telefon adımı; genel `message` uzun formda aşağıda kalmasın diye aynı metin burada da gösterilir. */
  const [phoneOtpFeedback, setPhoneOtpFeedback] = useState("");
  /** E-posta OTP — üretimde HTML hata sayfası / proxy gövdesi `res.json()` patlatmasın; kullanıcıya satır içi geri bildirim. */
  const [emailOtpFeedback, setEmailOtpFeedback] = useState("");
  const [postAuthNext, setPostAuthNext] = useState("/panel/user");
  const [registrationJustCompleted, setRegistrationJustCompleted] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setLang(getLang(sp.get("lang") ?? undefined));
    setPostAuthNext(getSafeInternalNextPath(sp.get("next"), "/panel/user"));
  }, []);

  useEffect(() => {
    if (emailOtpSecondsLeft <= 0) return;
    const id = window.setTimeout(() => {
      setEmailOtpSecondsLeft((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [emailOtpSecondsLeft]);

  useEffect(() => {
    if (phoneOtpSecondsLeft <= 0) return;
    const id = window.setTimeout(() => {
      setPhoneOtpSecondsLeft((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [phoneOtpSecondsLeft]);

  const d = dictionary[lang];
  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);
  const phoneHiddenValue = useMemo(
    () => tryFormatE164(phoneCountryIso, phoneNational) ?? "",
    [phoneCountryIso, phoneNational],
  );
  const isReadonly = Boolean(savedProfile);
  const emailOtpGate = signupEmailRequired !== false;
  const phoneOtpGate = signupPhoneRequired !== false;
  const blockUntilEmailVerified = !isReadonly && emailOtpGate && !emailVerified;
  const blockUntilFullyVerified =
    !isReadonly && ((emailOtpGate && !emailVerified) || (phoneOtpGate && !phoneVerified));
  const displayMemberNumber =
    savedProfile?.memberNumber ?? (pendingMemberNumber !== null ? pendingMemberNumber : null);
  const savedDocuments = {
    diploma:
      savedProfile?.memberProfile.documents.find((d) => d.type === "DIPLOMA")?.fileUrl || "",
    engineering:
      savedProfile?.memberProfile.documents.find((d) => d.type === "ENGINEERING_SERVICE_CERTIFICATE")?.fileUrl || "",
    tax:
      savedProfile?.memberProfile.documents.find((d) => d.type === "TAX_CERTIFICATE")?.fileUrl || "",
  };

  async function loadProfile(opts?: { signal?: AbortSignal }) {
    try {
      const res = await fetch(clientApiUrl("/api/member-profile"), {
        credentials: "same-origin",
        cache: "no-store",
        signal: opts?.signal,
      });
      const data = res.ok ? await res.json() : { exists: false };
      if (data?.exists && data.profile) {
        setSavedProfile(data.profile);
        const bt = data.profile.memberProfile?.billingAccountType;
        if (bt === "CORPORATE" || bt === "INDIVIDUAL") {
          setBillingAccountType(bt);
        }
        setPendingMemberNumber(null);
      } else {
        setSavedProfile(null);
      }
    } catch {
      setSavedProfile(null);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 25_000);
    void loadProfile({ signal: ac.signal }).finally(() => {
      window.clearTimeout(timer);
      setLoadingProfile(false);
    });
  }, []);

  useEffect(() => {
    fetch(clientApiUrl("/api/professions"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProfessions(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(clientApiUrl("/api/register/options"), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (cancelled || !d || typeof d !== "object") return;
        const o = d as {
          signupEmailVerificationRequired?: boolean;
          signupPhoneVerificationRequired?: boolean;
        };
        const em = o.signupEmailVerificationRequired !== false;
        const ph = o.signupPhoneVerificationRequired !== false;
        setSignupEmailRequired(em);
        setSignupPhoneRequired(ph);
        if (!em) setEmailVerified(true);
        if (!ph) setPhoneVerified(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSignupEmailRequired(true);
          setSignupPhoneRequired(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReadonly || !savedProfile?.memberProfile) return;
    const ph = savedProfile.memberProfile.phone;
    if (!ph) {
      setPhoneCountryIso("TR");
      setPhoneNational("");
      return;
    }
    const p = parseStoredPhone(ph);
    if (p) {
      setPhoneCountryIso(p.iso);
      setPhoneNational(p.national);
    } else {
      setPhoneCountryIso("TR");
      setPhoneNational(ph.replace(/\D/g, ""));
    }
  }, [isReadonly, savedProfile?.memberProfile]);

  async function clearSignupProofCookie() {
    try {
      await fetch(clientApiUrl("/api/register/verify-email-otp"), {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* yoksay */
    }
  }

  async function clearSignupPhoneProofCookie() {
    try {
      await fetch(clientApiUrl("/api/register/verify-phone-otp"), {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* yoksay */
    }
  }

  async function requestEmailOtp() {
    const email = regEmail.trim();
    if (!email) {
      setRegEmailError("");
      setMessage("Önce e-posta adresinizi girin.");
      setEmailOtpFeedback("Önce e-posta adresinizi girin.");
      return;
    }
    const emailOk = signupEmailFieldSchema.safeParse(email);
    if (!emailOk.success) {
      setRegEmailError("Geçerli bir e-posta adresi girin.");
      setMessage("Geçerli bir e-posta adresi girin.");
      setEmailOtpFeedback("Geçerli bir e-posta adresi girin.");
      return;
    }
    setRegEmailError("");
    setOtpEmailSending(true);
    setMessage("");
    setEmailOtpFeedback("");
    const ac = new AbortController();
    const abortTimer = window.setTimeout(() => ac.abort(), 60_000);
    try {
      const res = await fetch(clientApiUrl("/api/register/request-email-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailOk.data }),
        signal: ac.signal,
      });
      const raw = await res.text();
      let data: {
        ok?: boolean;
        hint?: string;
        error?: unknown;
        retryAfterSec?: number;
        otpTtlMinutes?: number;
      } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          const errLine = `Sunucu yanıtı JSON değil (HTTP ${res.status}). CDN/proxy HTML döndüyse günlükleri kontrol edin.`;
          setMessage(errLine);
          setEmailOtpFeedback(errLine);
          return;
        }
      }
      if (!res.ok) {
        const base = apiErrorMessage(data.error, "E-posta kodu gönderilemedi.");
        const retry =
          typeof data.retryAfterSec === "number" && data.retryAfterSec > 0
            ? ` Çok fazla istek: yaklaşık ${data.retryAfterSec} sn sonra tekrar deneyin.`
            : "";
        const full = base + retry;
        setMessage(full);
        setEmailOtpFeedback(full);
        return;
      }
      const ttlMin =
        typeof data.otpTtlMinutes === "number" && data.otpTtlMinutes > 0
          ? Math.min(60, Math.floor(data.otpTtlMinutes))
          : signupOtpTtlMinutes;
      setSignupOtpTtlMinutes(ttlMin);
      setEmailVerified(false);
      setEmailOtpCode("");
      setEmailOtpSecondsLeft(ttlMin * 60);
      const okText =
        typeof data.hint === "string" && data.hint.trim()
          ? data.hint.trim()
          : SIGNUP_EMAIL_OTP_REQUEST_PUBLIC_HINT_TR;
      setMessage(okText);
      setEmailOtpFeedback("");
    } catch (e) {
      const aborted =
        typeof e === "object" &&
        e !== null &&
        "name" in e &&
        (e as { name: string }).name === "AbortError";
      const fail = aborted
        ? "İstek zaman aşımına uğradı (60 sn). Sunucu veya ağ gecikmesi olabilir; tekrar deneyin."
        : "Ağ hatası veya sunucuya ulaşılamadı. Sayfa adresinin doğru site olduğundan ve engelleme olmadığından emin olun.";
      setMessage(fail);
      setEmailOtpFeedback(fail);
    } finally {
      window.clearTimeout(abortTimer);
      setOtpEmailSending(false);
    }
  }

  async function verifyEmailOtp() {
    const emailRaw = regEmail.trim();
    const emailOk = signupEmailFieldSchema.safeParse(emailRaw);
    if (!emailOk.success) {
      setRegEmailError("Geçerli bir e-posta adresi girin.");
      setMessage("Geçerli bir e-posta adresi girin.");
      return;
    }
    const email = emailOk.data;
    const code = emailOtpCode.trim();
    if (!email) {
      setMessage("Önce e-posta adresinizi girin.");
      return;
    }
    setRegEmailError("");
    if (code.length < 4) {
      setMessage("E-postaya gelen 6 haneli kodu girin.");
      return;
    }
    setOtpVerifyLoading(true);
    setMessage("");
    setEmailOtpFeedback("");
    try {
      const res = await fetch(clientApiUrl("/api/register/verify-email-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      const raw = await res.text();
      let data: { error?: unknown } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { error?: unknown };
        } catch {
          const errLine = `Sunucu yanıtı okunamadı (HTTP ${res.status}).`;
          setEmailVerified(false);
          setMessage(errLine);
          setEmailOtpFeedback(errLine);
          return;
        }
      }
      if (!res.ok) {
        setEmailVerified(false);
        const errText =
          typeof data.error === "string"
            ? data.error
            : "Doğrulama başarısız. Kod hatalı veya süresi dolmuş olabilir — yeni kod isteyin.";
        setMessage(errText);
        setEmailOtpFeedback(errText);
        return;
      }
      setEmailVerified(true);
      setEmailOtpSecondsLeft(0);
      setPhoneVerified(false);
      setPhoneOtpCode("");
      setPhoneOtpSecondsLeft(0);
      setPhoneOtpFeedback("");
      setEmailOtpFeedback("");
      setMessage(
        "E-posta doğrulandı. Telefon numaranızı girip SMS kodu alın ve «Telefonu doğrula» ile onaylayın; ardından kayıt alanlarını doldurabilirsiniz.",
      );
    } catch {
      setEmailVerified(false);
      const fail = "E-posta doğrulama isteği başarısız (ağ veya sunucu).";
      setMessage(fail);
      setEmailOtpFeedback(fail);
    } finally {
      setOtpVerifyLoading(false);
    }
  }

  async function requestPhoneOtp() {
    const emailOk = signupEmailFieldSchema.safeParse(regEmail.trim());
    if (!emailOk.success) {
      setRegEmailError("Geçerli bir e-posta adresi girin.");
      setMessage("Telefon kodu için önce e-postanızı doğrulayın.");
      setPhoneOtpFeedback("Telefon kodu için önce e-postanızı doğrulayın.");
      return;
    }
    const e164 = tryFormatE164(phoneCountryIso, phoneNational);
    if (!e164) {
      setPhoneFieldError("Geçerli bir telefon numarası girin (ülke ve hat).");
      setMessage("Telefon doğrulama için önce geçerli bir numara girin.");
      setPhoneOtpFeedback("Telefon doğrulama için önce geçerli bir numara girin.");
      return;
    }
    setPhoneFieldError("");
    setOtpPhoneSending(true);
    setMessage("");
    setPhoneOtpFeedback("");
    try {
      const res = await fetch(clientApiUrl("/api/register/request-phone-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailOk.data, phone: e164 }),
      });
      const raw = await res.text();
      let data: { error?: unknown; hint?: string; smsSent?: boolean; otpTtlMinutes?: number } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { error?: unknown; hint?: string; smsSent?: boolean };
        } catch {
          const errLine = "Sunucu yanıtı geçersiz. Ağ sekmesinde HTTP kodunu veya yönetici günlüğünü kontrol edin.";
          setMessage(errLine);
          setPhoneOtpFeedback(errLine);
          return;
        }
      }
      if (!res.ok) {
        const errText = apiErrorMessage(data.error, "Telefon kodu gönderilemedi.");
        const extra =
          typeof data.hint === "string" && data.hint.trim() && !errText.includes(data.hint.trim())
            ? ` ${data.hint}`
            : "";
        const full = errText + extra;
        setMessage(full);
        setPhoneOtpFeedback(full);
        return;
      }
      const ttlMin =
        typeof data.otpTtlMinutes === "number" && data.otpTtlMinutes > 0
          ? Math.min(60, Math.floor(data.otpTtlMinutes))
          : signupOtpTtlMinutes;
      setSignupOtpTtlMinutes(ttlMin);
      setPhoneVerified(false);
      setPhoneOtpCode("");
      setPhoneOtpSecondsLeft(ttlMin * 60);
      const okText = data.smsSent
        ? `Telefonunuza SMS ile kod gönderildi. Kod ${formatSignupOtpTtlTr(ttlMin)} geçerlidir.`
        : typeof data.hint === "string"
          ? data.hint
          : "SMS kanalı kapalı görünüyor; geliştirme ortamında kod yine kaydedilir. Üretimde /admin/signup-sms-provider üzerinden İleti Merkezi, HTTP veya Twilio yapılandırın.";
      setMessage(okText);
      setPhoneOtpFeedback(okText);
    } catch {
      const fail = "Ağ hatası veya sunucuya ulaşılamadı. Bağlantıyı ve sayfa adresini (aynı site) kontrol edin.";
      setMessage(fail);
      setPhoneOtpFeedback(fail);
    } finally {
      setOtpPhoneSending(false);
    }
  }

  async function verifyPhoneOtp() {
    const emailOk = signupEmailFieldSchema.safeParse(regEmail.trim());
    if (!emailOk.success) {
      setRegEmailError("Geçerli bir e-posta adresi girin.");
      setMessage("Önce e-postanızı doğrulayın.");
      setPhoneOtpFeedback("Önce e-postanızı doğrulayın.");
      return;
    }
    const e164 = tryFormatE164(phoneCountryIso, phoneNational);
    if (!e164) {
      setPhoneFieldError("Geçerli bir telefon numarası girin.");
      setMessage("Telefon numaranızı kontrol edin.");
      setPhoneOtpFeedback("Geçerli bir telefon numarası girin.");
      return;
    }
    const code = phoneOtpCode.trim();
    if (code.length < 4) {
      setMessage("Telefona gelen 6 haneli kodu girin.");
      setPhoneOtpFeedback("Telefona gelen 6 haneli kodu girin.");
      return;
    }
    setOtpPhoneVerifyLoading(true);
    setMessage("");
    setPhoneOtpFeedback("");
    try {
      const res = await fetch(clientApiUrl("/api/register/verify-phone-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailOk.data, phone: e164, code }),
      });
      const raw = await res.text();
      let data: { error?: unknown } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { error?: unknown };
        } catch {
          const errLine = "Yanıt okunamadı. Oturum veya ağ hatası olabilir.";
          setPhoneVerified(false);
          setMessage(errLine);
          setPhoneOtpFeedback(errLine);
          return;
        }
      }
      if (!res.ok) {
        setPhoneVerified(false);
        const errLine =
          typeof data.error === "string"
            ? data.error
            : "Telefon doğrulaması başarısız. Kod hatalı veya süresi dolmuş olabilir.";
        setMessage(errLine);
        setPhoneOtpFeedback(errLine);
        return;
      }
      setPhoneVerified(true);
      setPhoneOtpSecondsLeft(0);
      setMessage(d.memberPage.afterPhoneVerified);
      setPhoneOtpFeedback("");
    } catch {
      setPhoneVerified(false);
      const fail = "Telefon doğrulama isteği başarısız (ağ veya sunucu).";
      setMessage(fail);
      setPhoneOtpFeedback(fail);
    } finally {
      setOtpPhoneVerifyLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    if (!isReadonly) {
      setRegistrationJustCompleted(false);
    }
    const form = new FormData(e.currentTarget);
    const professionId = String(form.get("professionId") || "").trim();
    if (!isReadonly && !professionId) {
      setMessage(d.memberPage.validationProfession);
      return;
    }

    const billingType = String(form.get("billingAccountType") || "INDIVIDUAL") as "INDIVIDUAL" | "CORPORATE";
    const addrLine = String(form.get("billingAddressLine") || "").trim();
    const givenName = String(form.get("givenName") || "").trim();
    const familyName = String(form.get("familyName") || "").trim();
    const fullNameFromParts = `${givenName} ${familyName}`.trim();
    if (!isReadonly && emailOtpGate && !emailVerified) {
      setMessage("Önce e-posta kodunu alıp «E-postayı doğrula» ile onaylayın.");
      return;
    }
    if (!isReadonly && phoneOtpGate && !phoneVerified) {
      setMessage("Önce telefon kodunu alıp «Telefonu doğrula» ile onaylayın.");
      return;
    }
    if (!isReadonly) {
      const emailOk = signupEmailFieldSchema.safeParse(String(form.get("email") || "").trim());
      if (!emailOk.success) {
        setRegEmailError("Geçerli bir e-posta adresi girin.");
        setMessage("Geçerli bir e-posta adresi girin.");
        return;
      }
      setRegEmailError("");
      if (phoneOtpGate) {
        const nat = phoneNational.replace(/\D/g, "");
        const natEff = phoneCountryIso === "TR" && nat.startsWith("0") ? nat.slice(1) : nat;
        if (!natEff) {
          setPhoneFieldError("Telefon numarası zorunludur.");
          setMessage("Kayıt için geçerli bir telefon numarası girin.");
          return;
        }
        const e164Submit = tryFormatE164(phoneCountryIso, phoneNational);
        if (!e164Submit) {
          setPhoneFieldError("Telefon numarası geçersiz veya eksik görünüyor.");
          setMessage("Telefon numaranızı kontrol edin (ülke kodu ve hat).");
          return;
        }
        setPhoneFieldError("");
      } else {
        const nat = phoneNational.replace(/\D/g, "");
        const natEff = phoneCountryIso === "TR" && nat.startsWith("0") ? nat.slice(1) : nat;
        if (natEff) {
          const e164Submit = tryFormatE164(phoneCountryIso, phoneNational);
          if (!e164Submit) {
            setPhoneFieldError("Telefon numarası geçersiz veya eksik görünüyor.");
            setMessage("Telefon numaranızı kontrol edin (ülke kodu ve hat).");
            return;
          }
        }
        setPhoneFieldError("");
      }
      if (!givenName || !familyName) {
        setMessage("Ad ve soyad ayrı ayrı doldurulmalıdır.");
        return;
      }
      if (fullNameFromParts.length < 2) {
        setMessage("Ad veya soyad çok kısa.");
        return;
      }
    }
    if (!isReadonly && addrLine.length < 5) {
      setMessage("Fatura adresi (sokak, bina, daire) en az 5 karakter olmalıdır.");
      return;
    }
    if (!isReadonly && billingType === "INDIVIDUAL") {
      const tc = digitsOnly(String(form.get("billingTcKimlik") || ""));
      if (!isValidTcKimlik(tc)) {
        setMessage("Geçerli bir TC Kimlik Numarası girin (11 hane).");
        return;
      }
    }
    if (!isReadonly && billingType === "CORPORATE") {
      if (String(form.get("billingCompanyTitle") || "").trim().length < 2) {
        setMessage("Kurumsal ünvan zorunludur.");
        return;
      }
      if (String(form.get("billingTaxOffice") || "").trim().length < 2) {
        setMessage("Vergi dairesi adı zorunludur.");
        return;
      }
      const vkn = digitsOnly(String(form.get("billingVkn") || ""));
      if (!isValidVknFormat(vkn)) {
        setMessage("Vergi numarası (VKN) 10 haneli olmalıdır.");
        return;
      }
    }

    setIsUploading(true);

    const payload = {
      email: String(form.get("email") || "")
        .trim()
        .toLowerCase(),
      name: isReadonly
        ? String(form.get("name") || "").trim()
        : fullNameFromParts,
      password: String(form.get("password") || ""),
      profilePhotoUrl: String(form.get("profilePhotoUrl") || "").trim() || undefined,
      phone: String(form.get("phone") || ""),
      province: String(form.get("province") || "").trim(),
      district: String(form.get("district") || "").trim(),
      professionId,
      billingAccountType: billingType,
      billingTcKimlik: String(form.get("billingTcKimlik") || "").trim(),
      billingCompanyTitle: String(form.get("billingCompanyTitle") || "").trim(),
      billingTaxOffice: String(form.get("billingTaxOffice") || "").trim(),
      billingVkn: String(form.get("billingVkn") || "").trim(),
      billingAddressLine: addrLine,
      billingPostalCode: String(form.get("billingPostalCode") || "").trim(),
      documents: {},
      newAdEmailOptIn: form.get("newAdEmailOptIn") != null,
    };

    try {
      const res = await fetch(clientApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error;
        const msg =
          Array.isArray(err)
            ? err.map((i: { message?: string }) => i.message).filter(Boolean).join(" ") || "Doğrulama hatası."
            : typeof err === "string"
              ? err
              : "Hata.";
        setMessage(msg);
        setIsUploading(false);
        return;
      }
      const num =
        typeof data.memberNumber === "number"
          ? data.memberNumber
          : Number(data.memberNumber);
      if (Number.isFinite(num)) {
        setPendingMemberNumber(num);
        setMessage(d.memberPage.registrationSuccess);
      } else {
        setMessage(d.memberPage.registrationSuccess);
      }
      setRegistrationJustCompleted(true);
    } catch {
      setMessage("Kayıt isteği gönderilemedi.");
      setIsUploading(false);
      return;
    }
    setIsUploading(false);
  }

  async function onUploadDocuments() {
    setMessage("");
    setDocUploading(true);
    const diplomaFile = readonlyDocFiles.diploma;
    const engineeringFile = readonlyDocFiles.engineering;
    const taxFile = readonlyDocFiles.tax;

    let diplomaUrl: string | undefined;
    let engineeringUrl: string | undefined;
    let taxUrl: string | undefined;
    try {
      if (diplomaFile && diplomaFile.size > 0) diplomaUrl = await uploadImage(diplomaFile);
      if (engineeringFile && engineeringFile.size > 0) engineeringUrl = await uploadImage(engineeringFile);
      if (taxFile && taxFile.size > 0) taxUrl = await uploadImage(taxFile);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Belge yükleme hatası.");
      setDocUploading(false);
      return;
    }

    const res = await fetch(clientApiUrl("/api/member-profile/documents"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diploma: diplomaUrl,
        engineeringServiceCertificate: engineeringUrl,
        taxCertificate: taxUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error?.[0]?.message || data.error || "Belge kaydı başarısız.");
      setDocUploading(false);
      return;
    }
    setMessage("Belgeler yüklendi veya güncellendi.");
    await loadProfile();
    setReadonlyDocFiles({});
    setDocUploading(false);
  }

  async function onUploadProfilePhoto() {
    if (!profilePhotoFile) {
      setMessage("Lütfen profil fotoğrafı seçin.");
      return;
    }
    setPhotoUploading(true);
    setMessage("");
    try {
      const url = await uploadImage(profilePhotoFile);
      const res = await fetch(clientApiUrl("/api/member-profile/profile-photo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhotoUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error?.[0]?.message || data.error || "Profil fotoğrafı kaydedilemedi.");
        setPhotoUploading(false);
        return;
      }
      await loadProfile();
      setProfilePhotoFile(null);
      setMessage("Profil fotoğrafı güncellendi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Profil fotoğrafı yüklenemedi.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onChangePassword() {
    setMessage("");
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setMessage("Mevcut şifre ve yeni şifre zorunludur.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Yeni şifre tekrarı eşleşmiyor.");
      return;
    }
    setPasswordChanging(true);
    const res = await fetch(clientApiUrl("/api/member-profile/password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error?.[0]?.message || data.error || "Şifre değiştirilemedi.");
      setPasswordChanging(false);
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMessage("Şifre başarıyla değiştirildi.");
    setPasswordChanging(false);
  }

  const emailInputDescribedBy = !isReadonly
    ? ["email-verify-hint", regEmailError ? "reg-email-error" : ""].filter(Boolean).join(" ") || undefined
    : undefined;

  return (
    <main id="uye-kayit" className="mx-auto w-full max-w-3xl p-6 space-y-4">
      <HomeBackButtonLink href={lang === "en" ? "/?lang=en" : "/?lang=tr"}>
        ← {d.nav.home}
      </HomeBackButtonLink>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 text-3xl font-bold tracking-tight sm:text-4xl">{d.nav.memberDocs}</h1>
        {!loadingProfile && !isReadonly && (
          <Link
            href={membersLoginHref(lang, postAuthNext)}
            className={`${homeBackPrimaryClassName} shrink-0 self-end whitespace-normal text-center sm:self-auto sm:whitespace-nowrap`}
          >
            {d.memberPage.alreadyMemberLogin} {d.memberPage.loginLinkLabel}
          </Link>
        )}
      </div>
      {loadingProfile && (
        <section className="glass-card space-y-2 rounded-2xl p-5">
          <p className="text-sm">{d.memberPage.loading}</p>
        </section>
      )}
      {!loadingProfile && (
      <form className="glass-card space-y-3 rounded-2xl p-5" onSubmit={onSubmit}>
        {!isReadonly && (
          <nav
            aria-label={d.memberPage.registrationProgressLabel}
            className="rounded-xl border border-orange-100 bg-orange-50/40 p-3"
          >
            <ol className="flex flex-wrap items-center gap-2 text-xs text-slate-700 sm:text-sm">
              <li className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-200 font-semibold text-orange-950">
                  1
                </span>
                <span>{d.memberPage.step1}</span>
              </li>
              <li aria-hidden className="text-orange-300">
                →
              </li>
              <li className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-200 font-semibold text-orange-950">
                  2
                </span>
                <span>{d.memberPage.step2}</span>
              </li>
              <li aria-hidden className="text-orange-300">
                →
              </li>
              <li className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-200 font-semibold text-orange-950">
                  3
                </span>
                <span>{d.memberPage.step3}</span>
              </li>
            </ol>
          </nav>
        )}
        {message ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800" role="status">
            {message}
          </p>
        ) : null}
        {isReadonly && <p className="text-sm font-semibold">Kayıtlı üye bilgileri (düzenleme kapalı)</p>}
        {displayMemberNumber !== null && (
          <div className="space-y-1">
            <label htmlFor="member-number-display" className="block text-sm font-medium text-slate-700">
              Üye kayıt numarası
            </label>
            <input
              id="member-number-display"
              type="text"
              readOnly
              tabIndex={-1}
              autoComplete="off"
              aria-readonly="true"
              value={String(displayMemberNumber)}
              onChange={() => {}}
              className="w-full cursor-not-allowed select-all rounded-lg border border-orange-300 bg-orange-100 p-2 text-orange-950 tabular-nums focus:outline-none focus:ring-0"
            />
            <p className="text-xs text-slate-500">Bu numara sistem tarafından atanır; değiştirilemez.</p>
          </div>
        )}
        {isReadonly ? (
          <input
            id="member-reg-email"
            name="email"
            type="email"
            className="w-full border rounded-lg p-2 bg-orange-100 text-orange-900 border-orange-300 cursor-not-allowed"
            placeholder="E-posta"
            autoComplete="email"
            defaultValue={savedProfile?.email || ""}
            readOnly
            required
          />
        ) : (
          <>
            <input
              id="member-reg-email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={regEmail}
            onChange={(e) => {
              setRegEmail(e.target.value);
              setRegEmailError("");
              setEmailVerified(false);
              setEmailOtpCode("");
              setEmailOtpSecondsLeft(0);
              setEmailOtpFeedback("");
              setPhoneVerified(false);
              setPhoneOtpCode("");
              setPhoneOtpSecondsLeft(0);
              void clearSignupProofCookie();
              void clearSignupPhoneProofCookie();
            }}
              className={`w-full border rounded-lg p-2 bg-white ${regEmailError ? "border-red-500" : ""}`}
              placeholder="E-posta"
              autoComplete="email"
              required
              aria-invalid={regEmailError ? true : undefined}
              aria-describedby={emailInputDescribedBy}
            />
            {regEmailError && (
              <p id="reg-email-error" className="text-sm text-red-600" role="alert">
                {regEmailError}
              </p>
            )}
          </>
        )}
        {!isReadonly &&
          signupEmailRequired !== null &&
          (signupEmailRequired === false || signupPhoneRequired === false) && (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              Yönetici ayarlarıyla bazı doğrulama adımları kapalı; kayıt OTP olmadan ilerleyebilir. Bu yalnızca
              demo / geliştirme içindir — üretimde her iki doğrulamayı da açık tutun.
            </p>
          )}
        {!isReadonly && emailOtpGate && (
          <>
            <p id="email-verify-hint" className="text-xs text-slate-600 leading-relaxed">
              {emailOtpGate && phoneOtpGate && (
                <>
                  Önce e-postanızı, ardından telefonunuzu doğrulamanız gerekir; ikisi tamamlanmadan kayıt alanları
                  açılmaz.{" "}
                </>
              )}
              {emailOtpGate && !phoneOtpGate && (
                <>E-postanızı doğruladıktan sonra kayıt alanları açılır (telefon SMS doğrulaması bu sitede kapalı). </>
              )}
              E-posta kodu{" "}
              <strong className="font-medium text-slate-800">{formatSignupOtpTtlTr(signupOtpTtlMinutes)}</strong>{" "}
              geçerlidir; süre dolunca yeni kod isteyin.
            </p>
            {emailOtpFeedback ? (
              <p
                className="rounded-md border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800"
                role="status"
                aria-live="polite"
              >
                {emailOtpFeedback}
              </p>
            ) : null}
            <div className="space-y-2 rounded-lg border border-orange-100 bg-orange-50/50 p-2">
              {emailOtpSecondsLeft > 0 && (
                <p
                  className="rounded-md border border-orange-200 bg-white px-3 py-2 text-center text-sm font-semibold tabular-nums text-orange-950"
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  Kod geçerlilik süresi:{" "}
                  <span className="font-mono tracking-tight">{formatOtpMmSs(emailOtpSecondsLeft)}</span>
                  {emailOtpSecondsLeft <= 10 && (
                    <span className="mt-1 block text-xs font-normal text-orange-800">
                      Süre dolmadan «E-postayı doğrula» ile onaylayın veya süre bitince yeni kod isteyin.
                    </span>
                  )}
                </p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="emailOtp">
                    E-posta doğrulama kodu (6 hane)
                  </label>
                  <input
                    id="emailOtp"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-orange-200 bg-white p-2 text-center font-mono text-sm tracking-widest"
                    placeholder="••••••"
                    aria-label="E-posta doğrulama kodu"
                  />
                </div>
                <button
                  type="button"
                  className="chip shrink-0"
                  disabled={otpEmailSending || emailOtpSecondsLeft > 0}
                  onClick={() => void requestEmailOtp()}
                >
                  {otpEmailSending
                    ? "Gönderiliyor…"
                    : emailOtpSecondsLeft > 0
                      ? `Yeni kod (${formatOtpMmSs(emailOtpSecondsLeft)})`
                      : "E-postaya kod gönder"}
                </button>
                <button
                  type="button"
                  className="chip shrink-0 border-orange-400 bg-orange-100 font-medium text-orange-950 hover:bg-orange-200"
                  disabled={otpVerifyLoading || !emailOtpCode.trim()}
                  onClick={() => void verifyEmailOtp()}
                >
                  {otpVerifyLoading ? "Doğrulanıyor…" : "E-postayı doğrula"}
                </button>
              </div>
            </div>
          </>
        )}
        <div className="space-y-1">
          <span id="member-phone-label" className="block text-sm font-medium text-slate-700">
            Telefon{" "}
            <span className="font-normal text-slate-500">
              {phoneOtpGate ? "(zorunlu — SMS doğrulama)" : "(isteğe bağlı — SMS doğrulama kapalı)"}
            </span>
          </span>
          {!isReadonly && (
            <input type="hidden" name="phone" value={phoneHiddenValue} readOnly aria-hidden="true" />
          )}
          <p id="member-phone-hint" className="text-xs text-slate-600">
            Ülke kodunu seçin; hat numarasını ulusal formatta yazın. Türkiye için başta 0 olmadan da
            girebilirsiniz.
            {phoneOtpGate
              ? " E-posta doğrulandıktan sonra SMS kodu alıp «Telefonu doğrula» ile onaylayın."
              : " Telefon doğrulaması kapalıysa numarayı boş bırakabilir veya isteğe bağlı girersiniz; doluysa E.164 formatında saklanır."}{" "}
            Kayıt E.164 formatında saklanır.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="sm:w-[min(100%,15rem)] shrink-0">
              <label htmlFor="member-phone-country" className="sr-only">
                Ülke telefon kodu
              </label>
              <select
                id="member-phone-country"
                className={`h-[42px] w-full rounded-lg border px-2 text-sm ${isReadonly ? "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-900" : blockUntilEmailVerified ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500" : "border-slate-300 bg-white"}`}
                value={phoneCountryIso}
                disabled={isReadonly || blockUntilEmailVerified}
                aria-label="Ülke kodu"
                onChange={(e) => {
                  setPhoneCountryIso(e.target.value as CountryCode);
                  setPhoneFieldError("");
                  setPhoneVerified(false);
                  setPhoneOtpCode("");
                  setPhoneOtpSecondsLeft(0);
                  void clearSignupPhoneProofCookie();
                }}
              >
                {countryDialOptions.map((opt) => (
                  <option key={opt.iso} value={opt.iso}>
                    {flagEmoji(opt.iso)} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="member-reg-phone-national" className="sr-only">
                Telefon numarası (ulusal)
              </label>
              <input
                id="member-reg-phone-national"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className={`w-full rounded-lg border p-2 ${isReadonly ? "cursor-not-allowed border-orange-300 bg-orange-100 text-orange-900" : blockUntilEmailVerified ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500" : phoneFieldError ? "border-red-500 bg-white" : "border-slate-300 bg-white"}`}
                placeholder={phoneCountryIso === "TR" ? "5XX XXX XX XX veya 05XX…" : "Ulusal hat numarası"}
                value={phoneNational}
                readOnly={isReadonly}
                disabled={blockUntilEmailVerified && !isReadonly}
                aria-invalid={phoneFieldError ? true : undefined}
                aria-labelledby="member-phone-label"
                aria-describedby={phoneFieldError ? "phone-field-error member-phone-hint" : "member-phone-hint"}
                onChange={(e) => {
                  setPhoneNational(e.target.value);
                  setPhoneFieldError("");
                  setPhoneVerified(false);
                  setPhoneOtpCode("");
                  setPhoneOtpSecondsLeft(0);
                  setPhoneOtpFeedback("");
                  void clearSignupPhoneProofCookie();
                }}
              />
            </div>
          </div>
          {phoneFieldError && (
            <p id="phone-field-error" className="text-sm text-red-600" role="alert">
              {phoneFieldError}
            </p>
          )}
        </div>
        {!isReadonly && phoneOtpGate && (
          <div
            className={`space-y-2 rounded-lg border border-orange-100 bg-orange-50/50 p-2 ${blockUntilEmailVerified ? "opacity-60" : ""}`}
          >
            <p id="phone-verify-hint" className="text-xs text-slate-600 leading-relaxed">
              E-posta doğrulandıktan sonra telefonunuza SMS gönderilir. Kod{" "}
              <strong className="font-medium text-slate-800">{formatSignupOtpTtlTr(signupOtpTtlMinutes)}</strong>{" "}
              geçerlidir; yeni kod için aynı süre bekleyin.
            </p>
            {phoneOtpFeedback && (
              <p
                className="rounded-md border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800"
                role="status"
                aria-live="polite"
              >
                {phoneOtpFeedback}
              </p>
            )}
            {phoneOtpSecondsLeft > 0 && (
              <p
                className="rounded-md border border-orange-200 bg-white px-3 py-2 text-center text-sm font-semibold tabular-nums text-orange-950"
                role="timer"
                aria-live="polite"
                aria-atomic="true"
              >
                Telefon kodu yeniden isteme:{" "}
                <span className="font-mono tracking-tight">{formatOtpMmSs(phoneOtpSecondsLeft)}</span>
              </p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem] flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="phoneOtp">
                  Telefon doğrulama kodu (6 hane)
                </label>
                <input
                  id="phoneOtp"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  disabled={blockUntilEmailVerified}
                  value={phoneOtpCode}
                  onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg border border-orange-200 bg-white p-2 text-center font-mono text-sm tracking-widest disabled:cursor-not-allowed"
                  placeholder="••••••"
                  aria-describedby="phone-verify-hint"
                />
              </div>
              <button
                type="button"
                className="chip shrink-0"
                disabled={blockUntilEmailVerified || otpPhoneSending || phoneOtpSecondsLeft > 0}
                onClick={() => void requestPhoneOtp()}
              >
                {otpPhoneSending
                  ? "Gönderiliyor…"
                  : phoneOtpSecondsLeft > 0
                    ? `Yeni kod (${formatOtpMmSs(phoneOtpSecondsLeft)})`
                    : "Telefona kod gönder"}
              </button>
              <button
                type="button"
                className="chip shrink-0 border-orange-400 bg-orange-100 font-medium text-orange-950 hover:bg-orange-200"
                disabled={blockUntilEmailVerified || otpPhoneVerifyLoading || !phoneOtpCode.trim()}
                onClick={() => void verifyPhoneOtp()}
              >
                {otpPhoneVerifyLoading ? "Doğrulanıyor…" : "Telefonu doğrula"}
              </button>
            </div>
            {phoneVerified && (
              <p className="text-xs font-medium text-emerald-800" role="status">
                Telefon doğrulandı.
              </p>
            )}
          </div>
        )}
        {isReadonly ? (
          <>
            <label htmlFor="member-name-readonly" className="mb-1 block text-xs font-semibold text-slate-600">
              Ad Soyad
            </label>
            <input
              id="member-name-readonly"
              name="name"
              className="w-full border rounded-lg p-2 bg-orange-100 text-orange-900 border-orange-300 cursor-not-allowed"
              defaultValue={savedProfile?.name || ""}
              readOnly
              required
            />
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="member-given-name" className="mb-1 block text-xs font-semibold text-slate-600">
                Ad
              </label>
              <input
                id="member-given-name"
                name="givenName"
                autoComplete="given-name"
                className={`w-full border rounded-lg p-2 ${blockUntilFullyVerified ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                placeholder={billingAccountType === "CORPORATE" ? "Yetkili adı" : "Adınız"}
                disabled={blockUntilFullyVerified}
                required
              />
            </div>
            <div>
              <label htmlFor="member-family-name" className="mb-1 block text-xs font-semibold text-slate-600">
                Soyad
              </label>
              <input
                id="member-family-name"
                name="familyName"
                autoComplete="family-name"
                className={`w-full border rounded-lg p-2 ${blockUntilFullyVerified ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                placeholder={billingAccountType === "CORPORATE" ? "Yetkili soyadı" : "Soyadınız"}
                disabled={blockUntilFullyVerified}
                required
              />
            </div>
          </div>
        )}
        {!isReadonly && billingAccountType === "CORPORATE" && (
          <p className="text-xs text-slate-600">
            Kurumsal üyelikte ad ve soyad faturada görünecek yetkili kişiye aittir; ticari ünvan aşağıda ayrıca istenir.
          </p>
        )}
        {!isReadonly && (
          <input
            name="password"
            type="password"
            className={`w-full border rounded-lg p-2 ${blockUntilFullyVerified ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
            placeholder="Şifre"
            disabled={blockUntilFullyVerified}
            required
          />
        )}
        {!isReadonly && (
          <fieldset
            disabled={blockUntilFullyVerified}
            className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4 disabled:opacity-60 disabled:pointer-events-none"
          >
            <legend className="text-sm font-semibold text-slate-800 px-1">Fatura bilgileri</legend>
            <p className="text-xs text-slate-600 leading-relaxed">
              E-arşiv / e-fatura düzenlenmesi için gerekli kimlik ve adres bilgileri. Seçiminize göre alanlar değişir.
            </p>
            <div className="flex flex-wrap gap-6" role="group" aria-label="Fatura tipi">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="billingAccountType"
                  value="INDIVIDUAL"
                  checked={billingAccountType === "INDIVIDUAL"}
                  onChange={() => setBillingAccountType("INDIVIDUAL")}
                  className="accent-orange-600"
                />
                Bireysel
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="billingAccountType"
                  value="CORPORATE"
                  checked={billingAccountType === "CORPORATE"}
                  onChange={() => setBillingAccountType("CORPORATE")}
                  className="accent-orange-600"
                />
                Kurumsal
              </label>
            </div>
            {billingAccountType === "INDIVIDUAL" && (
              <div className="space-y-1">
                <label htmlFor="billing-tc" className="block text-xs font-medium text-slate-700">
                  TC Kimlik No
                </label>
                <input
                  id="billing-tc"
                  name="billingTcKimlik"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  className="w-full rounded-lg border border-orange-200 bg-white p-2 font-mono tabular-nums tracking-wide"
                  placeholder="11 hane"
                  required
                />
              </div>
            )}
            {billingAccountType === "CORPORATE" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="billing-company" className="block text-xs font-medium text-slate-700">
                    Ticari ünvan
                  </label>
                  <input
                    id="billing-company"
                    name="billingCompanyTitle"
                    className="w-full rounded-lg border border-orange-200 bg-white p-2"
                    placeholder="Şirket unvanı (faturada görünecek)"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="billing-tax-office" className="block text-xs font-medium text-slate-700">
                    Vergi dairesi
                  </label>
                  <input
                    id="billing-tax-office"
                    name="billingTaxOffice"
                    className="w-full rounded-lg border border-orange-200 bg-white p-2"
                    placeholder="Örn. Kadıköy"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="billing-vkn" className="block text-xs font-medium text-slate-700">
                    Vergi numarası (VKN)
                  </label>
                  <input
                    id="billing-vkn"
                    name="billingVkn"
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full rounded-lg border border-orange-200 bg-white p-2 font-mono tabular-nums"
                    placeholder="10 hane"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="billing-address-line" className="block text-xs font-medium text-slate-700">
                Fatura teslim adresi
              </label>
              <textarea
                id="billing-address-line"
                name="billingAddressLine"
                rows={3}
                className="w-full rounded-lg border border-orange-200 bg-white p-2 text-sm"
                placeholder="Mahalle, cadde/sokak, bina no, daire (il ve ilçe yukarıda seçilir)"
                required
                defaultValue=""
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="billing-postal" className="block text-xs font-medium text-slate-700">
                Posta kodu <span className="font-normal text-slate-500">(isteğe bağlı)</span>
              </label>
              <input
                id="billing-postal"
                name="billingPostalCode"
                inputMode="numeric"
                className="w-full max-w-xs rounded-lg border border-orange-200 bg-white p-2 font-mono tabular-nums"
                placeholder="34000"
                maxLength={10}
              />
            </div>
          </fieldset>
        )}
        {isReadonly && savedProfile?.memberProfile.billingAccountType && (
          <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
            <h2 className="text-sm font-semibold text-slate-800">Fatura bilgileri (kayıtlı)</h2>
            <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[9rem_1fr]">
              <dt className="text-slate-500">Tip</dt>
              <dd>
                {savedProfile.memberProfile.billingAccountType === "CORPORATE" ? "Kurumsal" : "Bireysel"}
              </dd>
              {savedProfile.memberProfile.billingAccountType === "INDIVIDUAL" && (
                <>
                  <dt className="text-slate-500">TC Kimlik</dt>
                  <dd className="font-mono tabular-nums">
                    {savedProfile.memberProfile.billingTcKimlik ?? "—"}
                  </dd>
                </>
              )}
              {savedProfile.memberProfile.billingAccountType === "CORPORATE" && (
                <>
                  <dt className="text-slate-500">Ticari ünvan</dt>
                  <dd>{savedProfile.memberProfile.billingCompanyTitle ?? "—"}</dd>
                  <dt className="text-slate-500">Vergi dairesi</dt>
                  <dd>{savedProfile.memberProfile.billingTaxOffice ?? "—"}</dd>
                  <dt className="text-slate-500">VKN</dt>
                  <dd className="font-mono tabular-nums">{savedProfile.memberProfile.billingVkn ?? "—"}</dd>
                </>
              )}
              <dt className="text-slate-500">Fatura adresi</dt>
              <dd className="break-words whitespace-pre-wrap">
                {savedProfile.memberProfile.billingAddressLine ?? "—"}
              </dd>
              <dt className="text-slate-500">Posta kodu</dt>
              <dd className="tabular-nums">{savedProfile.memberProfile.billingPostalCode ?? "—"}</dd>
            </dl>
            <p className="mt-2 text-xs text-slate-500">
              Bu bilgileri değiştirmek için destek ile iletişime geçin.
            </p>
          </section>
        )}
        <div className="rounded-lg border border-orange-100 bg-orange-50/30 p-2">
          <ProvinceDistrictSelect
            disabled={isReadonly || blockUntilFullyVerified}
            initialProvince={savedProfile?.memberProfile.province}
            initialDistrict={savedProfile?.memberProfile.district}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="member-profession" className="block text-sm font-medium text-slate-700">
            {d.memberPage.professionLabel}
          </label>
          <ProfessionCombobox
            professions={professions}
            labels={{
              placeholder: d.memberPage.comboboxPlaceholder,
              noResults: d.memberPage.comboboxNoResults,
              clear: d.memberPage.comboboxClear,
              searching: d.memberPage.comboboxSearching,
            }}
            initialProfessionId={savedProfile?.memberProfile.professionId ?? null}
            disabled={isReadonly || blockUntilFullyVerified}
            required={!isReadonly}
            inputId="member-profession"
            serverSearch
          />
          <p className="text-xs text-slate-500">{d.memberPage.professionHelp}</p>
        </div>
        {!isReadonly && (
          <NewAdEmailOptInGradientBox>
            <label
              className={`flex items-start gap-2.5 text-sm ${blockUntilFullyVerified ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                name="newAdEmailOptIn"
                disabled={blockUntilFullyVerified}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/50 bg-white/10 accent-white disabled:cursor-not-allowed"
              />
              <span>
                <span className="font-semibold text-white">{d.memberPage.newAdEmailOptInLabel}</span>
                <span className="mt-0.5 block text-xs font-normal leading-relaxed text-white/95">
                  {d.memberPage.newAdEmailOptInHelp}
                </span>
              </span>
            </label>
          </NewAdEmailOptInGradientBox>
        )}
        {!isReadonly && (
          <div
            role="note"
            className="rounded-xl border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium leading-relaxed text-orange-950 shadow-sm"
          >
            {d.memberPage.signupDocumentsLaterNotice}
          </div>
        )}
        {!isReadonly && (
          <button className="btn-primary" type="submit" disabled={isUploading || blockUntilFullyVerified}>
            {isUploading ? d.memberPage.registerSending : d.common.submit}
          </button>
        )}
        {isReadonly && (
          <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-3">
            <div className="rounded-xl border-2 border-orange-400 bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 py-3 shadow-sm">
              <h2 className="text-base font-bold text-orange-950">{d.memberPage.panelStarBannerTitle}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm font-normal leading-relaxed text-slate-800">
                {d.memberPage.panelStarBannerLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-orange-700">
              Kilitli alanlar değiştirilemez. Belge, profil fotoğrafı ve şifre güncellemesi aşağıdan yapılabilir.
            </p>
            <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-2">
              <p className="text-sm font-medium">Profil fotoğrafı (isteğe bağlı)</p>
              {savedProfile?.profilePhotoUrl ? (
                <Image
                  src={savedProfile.profilePhotoUrl}
                  alt="Profil fotoğrafı"
                  width={160}
                  height={110}
                  className="h-24 w-24 rounded-lg border object-cover"
                  unoptimized
                />
              ) : (
                <p className="text-xs text-orange-700">Henüz profil fotoğrafı eklenmemiş.</p>
              )}
              <FileInputTr
                name="profilePhotoPick"
                chosenFileName={profilePhotoFile?.name ?? null}
                onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
              />
              <button className="btn-primary" type="button" disabled={photoUploading} onClick={() => void onUploadProfilePhoto()}>
                {photoUploading ? "Yükleniyor…" : "Profil fotoğrafı yükle"}
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-800">{d.memberPage.panelDocumentsHeading}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{d.memberPage.docSlotDiploma}</p>
                  <span className="chip shrink-0">
                    {savedDocuments.diploma ? d.memberPage.docChipUploaded : d.memberPage.docChipMissing}
                  </span>
                </div>
                {savedDocuments.diploma ? (
                  <Image
                    src={savedDocuments.diploma}
                    alt={d.memberPage.docSlotDiploma}
                    width={220}
                    height={140}
                    className="h-28 w-full rounded-lg border object-cover"
                    unoptimized
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-6 text-center text-xs text-slate-600">
                    {d.memberPage.docNotUploadedYet}
                  </p>
                )}
                <FileInputTr
                  name="diplomaFile"
                  chosenFileName={readonlyDocFiles.diploma?.name ?? null}
                  onChange={(e) => setReadonlyDocFiles((prev) => ({ ...prev, diploma: e.target.files?.[0] }))}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{d.memberPage.docSlotEngineering}</p>
                  <span className="chip shrink-0">
                    {savedDocuments.engineering ? d.memberPage.docChipUploaded : d.memberPage.docChipMissing}
                  </span>
                </div>
                {savedDocuments.engineering ? (
                  <Image
                    src={savedDocuments.engineering}
                    alt={d.memberPage.docSlotEngineering}
                    width={220}
                    height={140}
                    className="h-28 w-full rounded-lg border object-cover"
                    unoptimized
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-6 text-center text-xs text-slate-600">
                    {d.memberPage.docNotUploadedYet}
                  </p>
                )}
                <FileInputTr
                  name="engineeringServiceCertificateFile"
                  chosenFileName={readonlyDocFiles.engineering?.name ?? null}
                  onChange={(e) => setReadonlyDocFiles((prev) => ({ ...prev, engineering: e.target.files?.[0] }))}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{d.memberPage.docSlotTax}</p>
                  <span className="chip shrink-0">
                    {savedDocuments.tax ? d.memberPage.docChipUploaded : d.memberPage.docChipMissing}
                  </span>
                </div>
                {savedDocuments.tax ? (
                  <Image
                    src={savedDocuments.tax}
                    alt={d.memberPage.docSlotTax}
                    width={220}
                    height={140}
                    className="h-28 w-full rounded-lg border object-cover"
                    unoptimized
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-6 text-center text-xs text-slate-600">
                    {d.memberPage.docNotUploadedYet}
                  </p>
                )}
                <FileInputTr
                  name="taxCertificateFile"
                  chosenFileName={readonlyDocFiles.tax?.name ?? null}
                  onChange={(e) => setReadonlyDocFiles((prev) => ({ ...prev, tax: e.target.files?.[0] }))}
                />
              </div>
            </div>
            <button className="btn-primary" type="button" disabled={docUploading} onClick={() => void onUploadDocuments()}>
              {docUploading ? "Yükleniyor…" : "Belgeleri yükle"}
            </button>
            <div className="space-y-2 rounded-lg border border-orange-200 bg-white p-2">
              <p className="text-sm font-medium">Şifre değiştir</p>
              <input
                type="password"
                className="w-full border rounded-lg p-2 bg-white text-sm"
                placeholder="Mevcut şifre"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              />
              <input
                type="password"
                className="w-full border rounded-lg p-2 bg-white text-sm"
                placeholder="Yeni şifre"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
              <input
                type="password"
                className="w-full border rounded-lg p-2 bg-white text-sm"
                placeholder="Yeni şifre tekrar"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
              <button className="btn-primary" type="button" disabled={passwordChanging} onClick={() => void onChangePassword()}>
                {passwordChanging ? "İşleniyor…" : "Şifreyi değiştir"}
              </button>
            </div>
          </section>
        )}
        {registrationJustCompleted && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-sm text-slate-800">
            <p className="font-medium">{d.memberPage.afterRegisterLoginHint}</p>
            <Link
              href={membersLoginHref(lang, postAuthNext)}
              className={`${homeBackPrimaryClassName} mt-3 justify-center`}
            >
              {d.memberPage.loginLinkLabel}
            </Link>
          </div>
        )}
      </form>
      )}
    </main>
  );
}
