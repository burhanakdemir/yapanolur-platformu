import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { probeLocalUploadWritable, usesExternalLocalUploadRoot } from "@/lib/uploadStorage";

export const dynamic = "force-dynamic";

/**
 * Sağlık kontrolü: `GET /api/health` — hafif.
 * `GET /api/health?deep=1` — PostgreSQL `SELECT 1` (yük dengeleyici / izleme).
 * Yerel upload kullanılıyorsa (`STORAGE_PROVIDER=local`) opsiyonel disk yazma probu.
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) {
    return NextResponse.json({ ok: true, service: "ilan" });
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
