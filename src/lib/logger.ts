type LogLevel = "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { detail: String(err) };
}

function emitLine(level: LogLevel, msg: string, fields: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  if (isProd) {
    console.log(JSON.stringify(line));
  } else if (level === "error") {
    console.error(`[${line.ts}]`, msg, fields);
  } else if (level === "warn") {
    console.warn(`[${line.ts}]`, msg, fields);
  } else {
    console.log(`[${line.ts}]`, msg, fields);
  }
}

/** HTTP isteğinden (middleware ile gelen) istek kimliği. */
export function getRequestIdFromRequest(req: Pick<Request, "headers">): string | null {
  return req.headers.get("x-request-id");
}

export function createRequestLogger(requestId: string | null, route: string) {
  const rid = requestId ?? undefined;

  return {
    info(msg: string, extra?: Record<string, unknown>) {
      emitLine("info", msg, { requestId: rid, route, ...extra });
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      emitLine("warn", msg, { requestId: rid, route, ...extra });
    },
    error(msg: string, err: unknown, extra?: Record<string, unknown>) {
      const error = serializeError(err);
      emitLine("error", msg, { requestId: rid, route, error, ...extra });
      if (process.env.SENTRY_DSN?.trim()) {
        void import("@sentry/nextjs").then((Sentry) => {
          const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : msg);
          Sentry.captureException(e, {
            tags: { route },
            extra: { requestId: rid, ...extra, original: err instanceof Error ? undefined : err },
          });
        });
      }
    },
  };
}

/** Route handler / sunucu bileşenlerinde URL yolu. */
export function routeFromUrl(url: string | URL): string {
  try {
    return typeof url === "string" ? new URL(url).pathname : url.pathname;
  } catch {
    return "unknown";
  }
}
