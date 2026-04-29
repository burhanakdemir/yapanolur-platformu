import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

/**
 * Yerel: `public/uploads` altına yazar.
 * Üretim (Vercel): `BLOB_READ_WRITE_TOKEN` geçerliyse Vercel Blob kullanılır.
 * Token hatalı / süresi dolmuşsa otomatik olarak yerel diske düşer (geliştirme ve kurtarma).
 */
export async function saveUploadedFile(
  safeName: string,
  buffer: Buffer,
): Promise<{ url: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      const blob = await put(`uploads/${safeName}`, buffer, {
        access: "public",
        token,
      });
      return { url: blob.url };
    } catch (e) {
      console.error(
        "[saveUploadedFile] Vercel Blob basarisiz, yerel public/uploads deneniyor:",
        e,
      );
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(safeName) || ".jpg";
  const base = path.basename(safeName, ext).replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  const unique = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  const filePath = path.join(uploadsDir, unique);
  await fs.writeFile(filePath, buffer);
  return { url: `/uploads/${unique}` };
}
