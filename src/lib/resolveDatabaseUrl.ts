/**
 * Windows’ta `localhost` çoğu zaman IPv6 (::1) çözülür; Docker’daki Postgres ise genelde yalnızca IPv4 dinler.
 * Bağlantı “reddedildi” görünürken asıl sebep budur. Üretim host adlarını değiştirmek için `DATABASE_PREFER_IPV4=0`.
 */
export function resolveDatabaseUrl(url: string): string {
  const trimmed = url.trim();
  if (process.env.DATABASE_PREFER_IPV4 === "0" || process.env.DATABASE_PREFER_IPV4 === "false") {
    return trimmed;
  }
  return trimmed
    .replace(/@localhost(?=[:/])/g, "@127.0.0.1")
    .replace(/:\/\/localhost(?=[:/])/g, "://127.0.0.1");
}
