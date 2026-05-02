import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";
import AdminPaymentsClient from "./payments-client";

export default async function AdminPaymentsPage() {
  if (!(await hasFullAdminAccess())) {
    redirect(adminUrl());
  }
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect(adminUrl());
  }
  return <AdminPaymentsClient />;
}
