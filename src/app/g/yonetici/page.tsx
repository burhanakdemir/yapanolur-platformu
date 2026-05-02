import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/adminUrls";

/** Eski kısayol; kanonik yönetici girişi `adminUrl()` (varsayılan `/a/yonetici`; klasik modda `/admin`). */
export default function AdminGateLegacyPage() {
  redirect(adminUrl());
}
