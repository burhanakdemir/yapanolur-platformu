import { permanentRedirect } from "next/navigation";
import { adminUrl } from "@/lib/adminUrls";

/** `/admin/admis` yazım hatası → süper yönetici paneli */
export default function AdminAdmisTypoPage() {
  permanentRedirect(adminUrl("/admins"));
}
