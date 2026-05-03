/**
 * Üretimde çoklu süreç veya serverless için `UPSTASH_REDIS_REST_*` tanımlayın; yoksa bellek içi sayaç
 * yalnızca tek Node örneğinde tutarlıdır (.env.example içindeki kontrol listesine bakın).
 */
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/** İstemci IP (proxy / Vercel uyumlu). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export type RateLimitBucket =
  | "login"
  | "register"
  | "otp"
  | "adminGate"
  | "passwordChange"
  | "upload"
  /** Oturumsuz kayit dosya yuklemesi — oturumlu upload'dan ayri kotayi korur. */
  | "signupUpload"
  | "adCreate"
  | "adminTotp"
  /** Üye paneli iş deneyimi CRUD */
  | "workExperience"
  /** Genel site — anonim varlık ping’i (IP başına). */
  | "sitePresence";

const BUCKETS: Record<RateLimitBucket, { max: number; window: Duration; windowMs: number }> = {
  login: { max: 20, window: "15 m", windowMs: 15 * 60 * 1000 },
  register: { max: 8, window: "1 h", windowMs: 60 * 60 * 1000 },
  otp: { max: 40, window: "1 h", windowMs: 60 * 60 * 1000 },
  adminGate: { max: 15, window: "15 m", windowMs: 15 * 60 * 1000 },
  adminTotp: { max: 30, window: "15 m", windowMs: 15 * 60 * 1000 },
  sitePresence: { max: 180, window: "15 m", windowMs: 15 * 60 * 1000 },
  passwordChange: { max: 25, window: "1 h", windowMs: 60 * 60 * 1000 },
  upload: { max: 60, window: "1 h", windowMs: 60 * 60 * 1000 },
  signupUpload: { max: 40, window: "1 h", windowMs: 60 * 60 * 1000 },
  adCreate: { max: 20, window: "1 h", windowMs: 60 * 60 * 1000 },
  workExperience: { max: 60, window: "1 h", windowMs: 60 * 60 * 1000 },
};

let redisSingleton: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

const ratelimitByBucket = new Map<RateLimitBucket, Ratelimit>();

function getUpstashRatelimit(bucket: RateLimitBucket): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cached = ratelimitByBucket.get(bucket);
  if (cached) return cached;
  const cfg = BUCKETS[bucket];
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.max, cfg.window),
    prefix: `rl:${bucket}`,
    analytics: false,
  });
  ratelimitByBucket.set(bucket, rl);
  return rl;
}

/** Bellek içi kayan pencere (tek Node süreci / geliştirme; çoklu instance’da Upstash kullanın). */
const memoryHits = new Map<string, number[]>();
let memoryLimitCallCount = 0;
const MEMORY_SWEEP_EVERY_CALLS = 250;
const MEMORY_SWEEP_IDLE_MS = 2 * 60 * 60 * 1000;

function memoryLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  memoryLimitCallCount += 1;
  if (memoryLimitCallCount % MEMORY_SWEEP_EVERY_CALLS === 0) {
    for (const [k, arr] of memoryHits.entries()) {
      const recent = arr.filter((t) => now - t < MEMORY_SWEEP_IDLE_MS);
      if (recent.length === 0) {
        memoryHits.delete(k);
      } else if (recent.length !== arr.length) {
        memoryHits.set(k, recent);
      }
    }
  }
  let ts = memoryHits.get(key) ?? [];
  ts = ts.filter((t) => now - t < windowMs);
  if (ts.length >= max) {
    const oldest = ts[0]!;
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  ts.push(now);
  memoryHits.set(key, ts);
  return { ok: true, retryAfterSec: 0 };
}

function tooManyResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: "Cok fazla istek. Lutfen bir sure sonra tekrar deneyin.",
      retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

/**
 * Giriş, kayıt, OTP, yönetici kapısı, şifre değişimi için IP veya kullanıcı bazlı limit.
 * `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` tanımlıysa Upstash (üretim önerilir).
 */
export async function rateLimitGuard(
  req: Request,
  bucket: RateLimitBucket,
  opts?: { userId?: string },
): Promise<NextResponse | null> {
  const cfg = BUCKETS[bucket];
  const identity = opts?.userId ?? getClientIp(req);
  const limitKey = `${bucket}:${identity}`;

  const rl = getUpstashRatelimit(bucket);
  if (rl) {
    const { success, reset } = await rl.limit(limitKey);
    if (success) return null;
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return tooManyResponse(retryAfterSec);
  }

  const { ok, retryAfterSec } = memoryLimit(limitKey, cfg.max, cfg.windowMs);
  if (ok) return null;
  return tooManyResponse(retryAfterSec);
}
