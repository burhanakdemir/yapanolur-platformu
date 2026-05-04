import { clientApiUrl } from "@/lib/clientApi";

export async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });
}

/** Üye ilan görselleri: `/api/uploads` (oturum gerekir). */
export async function uploadListingImageFile(file: File): Promise<string> {
  const base64 = await fileToBase64(file);
  const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const res = await fetch(clientApiUrl("/api/uploads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: safeName,
      dataBase64: base64,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gorsel yukleme hatasi.");
  return String(data.url || "");
}
