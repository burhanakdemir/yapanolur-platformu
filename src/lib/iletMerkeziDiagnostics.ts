import { fingerprintIletiApiKey } from "@/lib/iletMerkeziRedact";
import { iletiMerkeziAuthenticationHash } from "@/lib/iletMerkeziSignupSms";

/**
 * Dış HMAC aracı ile karşılaştırma: hex hash’in ilk 8 karakteri.
 * (İleti: HMAC-SHA256(anahtar=gizli, veri=API key) → hex, macellan ile uyumlu.)
 */
export function buildIletiHashDiagnostics(key: string, secret: string): {
  keyFingerprint: string;
  keyCharLength: number;
  secretCharLength: number;
  hashHexLength: number;
  hashPrefix8: string;
  algorithm: string;
} {
  const k = key.trim();
  const s = secret.trim();
  const h = iletiMerkeziAuthenticationHash(k, s);
  return {
    keyFingerprint: fingerprintIletiApiKey(k),
    keyCharLength: k.length,
    secretCharLength: s.length,
    hashHexLength: h.length,
    hashPrefix8: h.slice(0, 8),
    algorithm: "HMAC-SHA256(key=gizli anahtar, data=API anahtarı) → hex; Node createHmac('sha256', secret).update(key)",
  };
}
