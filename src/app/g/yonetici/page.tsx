import { redirect } from "next/navigation";

/** Eski gizli adres; yonetici girisi artik /admin uzerinden. */
export default function AdminGateLegacyPage() {
  redirect("/admin");
}
