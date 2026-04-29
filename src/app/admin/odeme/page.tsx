import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import AdminOdemeClient from "./admin-odeme-client";

export default async function AdminOdemePage() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect("/admin");
  }
  return <AdminOdemeClient />;
}
