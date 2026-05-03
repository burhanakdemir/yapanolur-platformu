import { clientApiUrl } from "@/lib/clientApi";

/**
 * Üye paneli / belge yükleme ile aynı mantık: güvenli dosya adı, base64 gövde,
 * `storage_config` ve diğer upload API kodları için anlaşılır hata.
 */
export async function uploadMemberImage(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const payload = result.includes(",") ? result.split(",")[1] : result;
      resolve(payload);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const res = await fetch(clientApiUrl("/api/uploads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ filename, dataBase64: base64 }),
  });
  const data = (await res.json()) as { url?: string; error?: string; code?: string };
  if (!res.ok || !data?.url) {
    const msg =
      data?.code === "storage_config"
        ? "Dosya sunucusu yapılandırılmamış. Yöneticiye iletin (S3/storage)."
        : (data?.error || "Dosya yüklenemedi.");
    throw new Error(msg);
  }
  return String(data.url);
}
