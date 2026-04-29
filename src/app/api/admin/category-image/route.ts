import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidateCategoryRoutes } from "@/lib/revalidateCategoryRoutes";
import { saveUploadedFile } from "@/lib/uploadStorage";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function isUploadBlob(v: unknown): v is Blob {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as Blob).arrayBuffer === "function" &&
    typeof (v as Blob).size === "number"
  );
}

/**
 * Alt/ust kategori gorseli: FormData ile tek istek (JSON base64 yok).
 * Middleware: /api/admin/* — yonetici oturumu veya admin gate gerekir.
 */
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const form = await req.formData();
    const entry = form.get("file");
    const categoryIdRaw = form.get("categoryId");
    const categoryId =
      typeof categoryIdRaw === "string" ? categoryIdRaw.trim() : "";
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId gerekli." }, { status: 400 });
    }
    /** `instanceof Blob` bazi Node/undici ortamlarinda yanlis negatif donebilir. */
    if (!entry || typeof entry === "string" || !isUploadBlob(entry)) {
      return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });
    }
    const blob = entry;
    const originalName =
      entry instanceof File ? entry.name : "upload.jpg";
    const ext = path.extname(originalName).toLowerCase();
    const extOk = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(
      ext,
    );
    const mime = blob.type || "";
    if (!ALLOWED.has(mime) && !extOk) {
      return NextResponse.json(
        { error: "Yalnizca JPEG, PNG, WebP veya GIF." },
        { status: 400 },
      );
    }
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ error: "Dosya en fazla 4 MB olabilir." }, { status: 400 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const safeName =
      path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_") || "image.jpg";
    const { url } = await saveUploadedFile(safeName, buffer);

    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing) {
      return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { imageUrl: url },
    });
    revalidateCategoryRoutes();
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("[POST /api/admin/category-image]", e);
    return NextResponse.json({ error: "Yuklenemedi." }, { status: 500 });
  }
}
