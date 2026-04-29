import { permanentRedirect } from "next/navigation";

/** `/admin/admis` yazım hatası → süper yönetici paneli */
export default function AdminAdmisTypoPage() {
  permanentRedirect("/admin/admins");
}
