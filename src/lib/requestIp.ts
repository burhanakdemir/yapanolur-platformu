/** Client IP from reverse-proxy headers (Vercel, Cloudflare, nginx). */
export function getClientIpFromRequest(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const part = forwarded.split(",")[0]?.trim();
    if (part) return part;
  }
  const real = h.get("x-real-ip");
  if (real?.trim()) return real.trim();
  const cf = h.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  return "127.0.0.1";
}
