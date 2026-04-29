"use client";

import Link from "next/link";
import { useEffect } from "react";
import DbConnectionHelpCard from "@/components/DbConnectionHelpCard";
import PrismaEnumMismatchHelpCard from "@/components/PrismaEnumMismatchHelpCard";

function isPrismaUserRoleEnumMismatch(error: Error): boolean {
  const m = error.message ?? "";
  return (
    /not found in enum ['"]UserRole['"]/i.test(m) ||
    (/Value\s+['"][^'"]+['"]\s+not found in enum/i.test(m) && m.includes("UserRole"))
  );
}

/** Prisma/adapter cause zinciri; client bundle’da @/lib/dbErrors (Prisma) import edilmez. */
function collectErrorChainText(error: Error): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 12 && current != null; depth++) {
    if (current instanceof Error) {
      const err = current as Error;
      parts.push(String(err.message));
      const errno = err as NodeJS.ErrnoException;
      if (typeof errno.code === "string") parts.push(`code:${errno.code}`);
      current = (err as Error & { cause?: unknown }).cause;
    } else {
      try {
        parts.push(typeof current === "object" ? JSON.stringify(current) : String(current));
      } catch {
        parts.push(String(current));
      }
      break;
    }
  }
  return parts.join("\n");
}

function isLikelyDbConnectionClientError(error: Error): boolean {
  if (error.name === "DatabaseConnectionError") return true;
  const t = collectErrorChainText(error);
  return (
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Can't reach database server|connection refused|connect ECONNREFUSED|Server has closed|Connection terminated|timeout expired|getaddrinfo|password authentication failed for user|P1000|P1001|P1003|P1017|PrismaClientInitialization|DATABASE_URL ortam|SQLite.*file:/i.test(
      t,
    ) ||
    (/Invalid `prisma/i.test(t) && /ECONNREFUSED|ETIMEDOUT|Can't reach|ENOTFOUND|code:ECONNREFUSED/i.test(t))
  );
}

function isAuthSecretConfigError(error: Error): boolean {
  return /AUTH_SECRET ortam|AUTH_SECRET.*tanimlanmali/i.test(collectErrorChainText(error));
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  if (isPrismaUserRoleEnumMismatch(error)) {
    return <PrismaEnumMismatchHelpCard />;
  }

  if (isLikelyDbConnectionClientError(error)) {
    return (
      <div className="space-y-6">
        <DbConnectionHelpCard />
        <p className="text-center">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Tekrar dene
          </button>
        </p>
      </div>
    );
  }

  if (isAuthSecretConfigError(error)) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-orange-950">Oturum yapılandırması</h1>
        <p className="text-sm text-slate-600">
          Proje kökünde <code className="rounded bg-orange-50 px-1">.env</code> dosyasına{" "}
          <code className="rounded bg-orange-50 px-1">AUTH_SECRET</code> ekleyin (rastgele uzun dize; örnek:{" "}
          <code className="text-xs">openssl rand -base64 32</code> çıktısı). Sunucuyu yeniden başlatın.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="max-h-48 w-full overflow-auto rounded-lg bg-orange-50 p-3 text-left text-xs text-red-800">
            {collectErrorChainText(error)}
          </pre>
        )}
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Tekrar dene
        </button>
        <Link className="text-sm text-orange-800 underline" href="/">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-orange-950">Sayfa yüklenemedi</h1>
      <p className="text-sm text-slate-600">
        Bir hata oluştu. Ortam ayarlarını veya veritabanı bağlantısını kontrol edin.
      </p>
      {error.digest ? (
        <p className="text-xs text-slate-500">
          Kod: <code className="rounded bg-slate-100 px-1">{error.digest}</code>
        </p>
      ) : null}
      {process.env.NODE_ENV === "development" && (
        <pre className="max-h-56 w-full overflow-auto rounded-lg bg-orange-50 p-3 text-left text-xs text-red-800">
          {collectErrorChainText(error)}
          {error.stack ? `\n--- stack ---\n${error.stack}` : ""}
        </pre>
      )}
      <button
        type="button"
        className="btn-primary"
        onClick={() => reset()}
      >
        Tekrar dene
      </button>
      <Link className="text-sm text-orange-800 underline" href="/">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
