import { permanentRedirect } from "next/navigation";
import { adminUrl } from "@/lib/adminUrls";

/** Eski veya yanlış yazılan `/admin/admin` adresini süper yönetici paneline yönlendirir. */
export default function AdminAdminAliasPage() {
  permanentRedirect(adminUrl("/admins"));
}
