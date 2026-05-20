import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { probeLocalUploadWritable, usesExternalLocalUploadRoot } from "@/lib/uploadStorage";

export const dynamic = "force-dynamic";

function isDeepHealthAuthorized(req: Request): boolean {
  const secret = process.env.HEALTH_DEEP_SECRET?.trim();
  if (!secret) return false;
  const provided =
    req.headers.get("x-health-secret")?.trim() ||
    new URL(req.url).searchParams.get("secret")?.trim() ||
    "";
  return provided.length > 0 && provided === secret;
}

/**
 * Sağlık kontrolü: `GET /api/health` — hafif.
 * `GET /api/health?deep=1` — PostgreSQL + depolama (yalnızca `HEALTH_DEEP_SECRET` + `x-health-secret` veya `?secret=`).
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) {
    return NextResponse.json({ ok: true, service: "ilan" });
  }

  if (!isDeepHealthAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { ok: false, service: "ilan", database: "down" },
      { status: 503 },
    );
  }

  const sp = (process.env.STORAGE_PROVIDER ?? "").trim().toLowerCase();
  const runsLocalUploadProbe =
    process.env.NODE_ENV !== "production" ||
    sp === "local" ||
    process.env.ALLOW_LOCAL_UPLOADS_IN_PRODUCTION === "1" ||
    usesExternalLocalUploadRoot();

  let storage: Record<string, unknown> = {
    storage_provider_env: sp || null,
    local_upload_external_disk: usesExternalLocalUploadRoot(),
  };

  if (runsLocalUploadProbe) {
    const probe = await probeLocalUploadWritable();
    storage = {
      ...storage,
      local_upload_root: probe.root,
      local_upload_writable: probe.ok,
    };
  }

  return NextResponse.json({
    ok: true,
    service: "ilan",
    database: "up",
    storage,
  });
}
