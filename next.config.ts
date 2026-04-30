import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Geliştirme modunda LAN / Tailscale / mDNS kökenlerinin `/_next` isteklerinde 403 yememesi için.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 *
 * İsteğe bağlı: `.env` içinde `NEXT_DEV_ALLOWED_ORIGINS=192.168.1.7,my-pc.local` (virgülle hostname'ler).
 */
const defaultAllowedDevOrigins = [
  "127.0.0.1",
  /** IPv6 loopback; Origin başlığı bazen sadece buna düşer */
  "::1",
  "192.*.*.*",
  "10.*.*.*",
  "172.*.*.*",
  "100.*.*.*",
  "169.254.*.*",
  "*.local",
  "*.lan",
  /** Tailscale MagicDNS: tek segmentli host jokerleri (192.*.*.*) ile tutmaz */
  "*.tail-scale.ts.net",
];

const extraAllowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function envHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

const uploadHostFromBaseUrl = envHost(process.env.S3_PUBLIC_BASE_URL);
const uploadHostFromEndpoint = envHost(process.env.S3_ENDPOINT);
const extraImageHosts = [uploadHostFromBaseUrl, uploadHostFromEndpoint].filter(
  (v): v is string => Boolean(v),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraAllowedDevOrigins],
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  /** Eski veya farkli ortamlarda 404 alinmasin; kanonik: /admin/odeme */
  async redirects() {
    return [
      {
        source: "/admin/payment-providers",
        destination: "/admin/odeme",
        permanent: true,
      },
    ];
  },
  /** Güvenlik başlıkları (sıkı CSP uygulamayı kırabileceği için burada yalnızca genel başlıklar). */
  async headers() {
    const baseSecurity: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];
    /** Yalnızca tam HTTPS üretimde açın; localhost / HTTP ön yüzde tarayıcı HSTS ile kilitlenebilir. */
    if (process.env.ENABLE_HSTS === "1") {
      baseSecurity.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/:path*",
        headers: baseSecurity,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      ...extraImageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/**",
      })),
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
