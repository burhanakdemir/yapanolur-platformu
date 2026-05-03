/**
 * Next.js dev: `/_next` istekleri için `allowedDevOrigins` + env birleşimi.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 *
 * IPv4 jokerleri next.config.ts içinde; burada ek olarak somut IPv4/IPv6 ve
 * makine adı (tek segment — jokerlerle tutmaz) eklenir.
 */
const { networkInterfaces, hostname: osHostname } = require("node:os");

function listLanIPv4() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] ?? []) {
      const fam = iface.family;
      const isV4 = fam === "IPv4" || fam === 4;
      if (isV4 && !iface.internal) out.push(iface.address);
    }
  }
  return [...new Set(out)];
}

function listLanIPv6() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] ?? []) {
      const fam = iface.family;
      const isV6 = fam === "IPv6" || fam === 6;
      if (!isV6 || iface.internal || !iface.address) continue;
      const addr = String(iface.address).split("%")[0];
      if (addr) out.push(addr);
    }
  }
  return [...new Set(out)];
}

/**
 * process.env.NEXT_DEV_ALLOWED_ORIGINS içine LAN IPv4, IPv6 ve hostname ekler.
 * @returns {{ ips: string[], ip6: string[] }}
 */
function mergeNextDevAllowedOriginsIntoEnv() {
  const ips = listLanIPv4();
  const ip6 = listLanIPv6();
  const cur = (process.env.NEXT_DEV_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hostExtras = [];
  try {
    const h = osHostname();
    if (h && typeof h === "string") hostExtras.push(h.toLowerCase());
  } catch {
    /* ignore */
  }
  const merged = [...cur, ...ips, ...ip6, ...hostExtras];
  if (merged.length) {
    process.env.NEXT_DEV_ALLOWED_ORIGINS = [...new Set(merged)].join(",");
  }
  return { ips, ip6 };
}

module.exports = {
  mergeNextDevAllowedOriginsIntoEnv,
};
