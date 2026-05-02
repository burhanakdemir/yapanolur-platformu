import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/adminUrls";

/** Eski kısayol; kanonik yönetici girişi `adminUrl()` (varsayılan `/admin`, önek ayarlıysa örn. `/a/yonetici`). */
export default function AdminGateLegacyPage() {
  redirect(adminUrl());
}
