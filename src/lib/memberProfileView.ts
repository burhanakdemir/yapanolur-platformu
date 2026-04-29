import { isStaffAdminRole } from "@/lib/adminRoles";

/** Prisma User where: herkese onayli uye; kendi profili veya yonetici icin onay sarti yok. */
export function whereMemberProfileVisible(
  targetUserId: string,
  opts: { viewerOwnsProfile: boolean; viewerIsAdmin: boolean },
) {
  return {
    id: targetUserId,
    role: "MEMBER" as const,
    ...(!opts.viewerOwnsProfile && !opts.viewerIsAdmin ? { isMemberApproved: true as const } : {}),
  };
}

export function viewerProfileFlags(
  session: { userId: string; role: string } | null,
  targetUserId: string,
) {
  const viewerOwnsProfile = session?.role === "MEMBER" && session.userId === targetUserId;
  const viewerIsAdmin = isStaffAdminRole(session?.role);
  return { viewerOwnsProfile, viewerIsAdmin };
}
