import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import { normalizeTrPhone } from "@/lib/phone";

/** ISO 3166-1 alpha-2 → bölgesel gösterim bayrağı (emoji). */
export function flagEmoji(iso2: string): string {
  const u = iso2.toUpperCase();
  if (u.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = u.charCodeAt(0);
  const b = u.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return "🏳️";
  return String.fromCodePoint(A + a - 65, A + b - 65);
}

export type CountryDialOption = { iso: CountryCode; dial: string; label: string };

let cachedList: CountryDialOption[] | null = null;

/** Alfabetik (tr), Türkiye her zaman başta. */
export function getCountryDialOptions(): CountryDialOption[] {
  if (cachedList) return cachedList;
  let dn: Intl.DisplayNames;
  try {
    dn = new Intl.DisplayNames(["tr"], { type: "region" });
  } catch {
    dn = new Intl.DisplayNames(["en"], { type: "region" });
  }
  const countries = getCountries();
  const items: CountryDialOption[] = countries.map((iso) => {
    const dial = getCountryCallingCode(iso);
    const regionName = dn.of(iso) ?? iso;
    return {
      iso,
      dial,
      label: `${regionName} (+${dial})`,
    };
  });
  items.sort((a, b) => a.label.localeCompare(b.label, "tr"));
  const trIdx = items.findIndex((x) => x.iso === "TR");
  if (trIdx > 0) {
    const [tr] = items.splice(trIdx, 1);
    items.unshift(tr);
  }
  cachedList = items;
  return cachedList;
}

function nationalDigitsForCountry(iso: CountryCode, rawNational: string): string {
  let d = rawNational.replace(/\D/g, "");
  if (iso === "TR" && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Ulusal numara + ülke → geçerliyse E.164, değilse null. Boş ulusal → null. */
export function tryFormatE164(countryIso: CountryCode, nationalRaw: string): string | null {
  const d = nationalDigitsForCountry(countryIso, nationalRaw);
  if (!d) return null;
  const cc = getCountryCallingCode(countryIso);
  const full = `+${cc}${d}`;
  if (!isValidPhoneNumber(full)) return null;
  try {
    return parsePhoneNumber(full).format("E.164");
  } catch {
    return null;
  }
}

export function isOptionalPhoneValid(e164OrEmpty: string): boolean {
  const s = e164OrEmpty.trim();
  if (!s) return true;
  return isValidPhoneNumber(s);
}

/**
 * API girişi: E.164 veya libphonenumber’ın kabul ettiği uluslararası string;
 * ayrıca yalnızca TR için mevcut normalizeTrPhone davranışı (geriye dönük).
 */
export function normalizePhoneInputToE164(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (isValidPhoneNumber(s)) {
    try {
      return parsePhoneNumber(s).format("E.164");
    } catch {
      return null;
    }
  }
  const tr = normalizeTrPhone(s);
  if (tr && isValidPhoneNumber(tr)) {
    try {
      return parsePhoneNumber(tr).format("E.164");
    } catch {
      return null;
    }
  }
  return null;
}

export function parseStoredPhone(stored: string | null | undefined): {
  iso: CountryCode;
  national: string;
  e164: string;
} | null {
  if (!stored?.trim()) return null;
  try {
    const p = parsePhoneNumber(stored.trim());
    const iso = (p.country ?? "TR") as CountryCode;
    return { iso, national: p.nationalNumber, e164: p.format("E.164") };
  } catch {
    const tr = normalizeTrPhone(stored);
    if (!tr) return null;
    try {
      const p = parsePhoneNumber(tr);
      const iso = (p.country ?? "TR") as CountryCode;
      return { iso, national: p.nationalNumber, e164: p.format("E.164") };
    } catch {
      return null;
    }
  }
}
