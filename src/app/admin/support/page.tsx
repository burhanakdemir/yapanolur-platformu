import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import AdminSupportClient from "./admin-support-client";

export default async function AdminSupportPage() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isStaffAdminRole(session?.role)) {
    redirect("/admin");
  }

  return <AdminSupportClient />;
}
