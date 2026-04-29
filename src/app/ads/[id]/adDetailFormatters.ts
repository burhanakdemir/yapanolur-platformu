import type { Lang } from "@/lib/i18n";

export function formatAdStatusLabel(status: string | undefined, lang: Lang): string {
  const s = status ?? "APPROVED";
  const tr: Record<string, string> = {
    PENDING: "Onay bekliyor",
    APPROVED: "Yayında",
    REJECTED: "Reddedildi",
    CANCELLED: "İptal",
    COMPLETED: "Tamamlandı",
  };
  const en: Record<string, string> = {
    PENDING: "Pending approval",
    APPROVED: "Published",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
  };
  const map = lang === "en" ? en : tr;
  return map[s] ?? s;
}

export function formatDetailDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "en" ? "en-GB" : "tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function adDetailQuerySuffix(lang: Lang) {
  return lang === "en" ? "?lang=en" : "";
}

export const BID_AMOUNT_MIN = 100;
export const BID_AMOUNT_MAX = 99_999_999;

/** Sadece rakamlar; en fazla 8 hane (99.999.999) */
export function bidAmountDigitsFromInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function bidAmountDisplayTr(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}
