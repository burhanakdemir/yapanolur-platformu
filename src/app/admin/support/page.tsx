import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";
import AdminSupportClient from "./admin-support-client";

export default async function AdminSupportPage() {
  if (!(await hasFullAdminAccess())) {
    redirect(adminUrl());
  }
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isStaffAdminRole(session?.role)) {
    redirect(adminUrl());
  }

  return <AdminSupportClient />;
}
