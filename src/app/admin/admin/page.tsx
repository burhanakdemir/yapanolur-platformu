import { permanentRedirect } from "next/navigation";

/** Eski veya yanlış yazılan `/admin/admin` adresini süper yönetici paneline yönlendirir. */
export default function AdminAdminAliasPage() {
  permanentRedirect("/admin/admins");
}
