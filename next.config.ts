import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import {
  embedAdminLegacyHiddenFlagFromEnv,
  getAdminPanelPathPrefixFromEnv,
} from "./src/lib/adminPanelPathEnv";

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
const imageHostsFromEnv = (process.env.NEXT_IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const extraImageHosts = [
  ...new Set([...imageHostsFromEnv, uploadHostFromBaseUrl, uploadHostFromEndpoint].filter(Boolean)),
] as string[];

const nextConfig: NextConfig = {
  /**
   * Middleware / istemci derlemesi Edge+webpack üzerinde NEXT_PUBLIC okumasını düzgün sabitlemek için
   * (aksi halde `/a/yonetici` rewrite çalışmayabilir).
   */
  env: {
    NEXT_PUBLIC_ADMIN_PANEL_PATH: getAdminPanelPathPrefixFromEnv(),
  },
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraAllowedDevOrigins],
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  /**
   * `LOCAL_UPLOAD_ROOT` tanımlıyken dosyalar `public/` dışında kalıcı diskte tutulur;
   * `/uploads/*` istekleri `app/api/local-upload` üzerinden stream edilir (build ortamında env olmalı).
   */
  async rewrites() {
    const uploadRewrites =
      (process.env.LOCAL_UPLOAD_ROOT ?? "").trim()
        ? [{ source: "/uploads/:path*", destination: "/api/local-upload/:path*" }]
        : [];

    const prefix = getAdminPanelPathPrefixFromEnv();
    const adminRewrites =
      prefix === ""
        ? []
        : [
            { source: prefix, destination: "/admin" },
            { source: `${prefix}/:path*`, destination: "/admin/:path*" },
          ];

    if (adminRewrites.length === 0 && uploadRewrites.length === 0) return [];

    return {
      beforeFiles: adminRewrites,
      afterFiles: uploadRewrites,
      fallback: [],
    };
  },
  /** Eski veya farkli ortamlarda 404 alinmasin; kanonik ödeme sayfası (tarayıcı tabanı adminUrl ile uyumlu). */
  async redirects() {
    const browserBase = getAdminPanelPathPrefixFromEnv() || "/admin";
    const out: { source: string; destination: string; permanent: boolean }[] = [];

    if (embedAdminLegacyHiddenFlagFromEnv() === "1") {
      out.push(
        { source: "/admin", destination: "/", permanent: false },
        { source: "/admin/:path*", destination: "/", permanent: false },
      );
    }

    out.push({
      source: `${browserBase}/payment-providers`,
      destination: `${browserBase}/odeme`,
      permanent: true,
    });

    return out;
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
