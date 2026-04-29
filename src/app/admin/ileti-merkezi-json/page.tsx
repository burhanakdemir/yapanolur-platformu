import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import IletiMerkeziJsonClient from "./ileti-merkezi-json-client";

export default async function IletiMerkeziJsonPage() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect("/admin");
  }
  return <IletiMerkeziJsonClient />;
}
