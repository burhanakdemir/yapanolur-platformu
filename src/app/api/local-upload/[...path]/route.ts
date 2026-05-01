import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getLocalUploadAbsoluteRoot,
  usesExternalLocalUploadRoot,
  uploadMimeTypeForExtension,
} from "@/lib/uploadStorage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path?: string[] }> };

/** Path traversal engeli: yalnızca kök altındaki düz dosya adları. */
function resolveSafeFilePath(rootAbs: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.some((s) => !s || s === "." || s === "..")) return null;
  const resolvedRoot = path.resolve(rootAbs);
  const joined = path.resolve(resolvedRoot, ...segments);
  const rel = path.relative(resolvedRoot, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return joined;
}

export async function GET(_req: Request, ctx: Ctx) {
  if (!usesExternalLocalUploadRoot()) {
    return new NextResponse(null, { status: 404 });
  }
  const segments = (await ctx.params).path ?? [];
  const root = getLocalUploadAbsoluteRoot();
  const filePath = resolveSafeFilePath(root, segments);
  if (!filePath) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": uploadMimeTypeForExtension(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
