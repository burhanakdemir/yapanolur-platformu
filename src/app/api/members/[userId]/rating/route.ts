import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole, staffViewerRoleLabel } from "@/lib/adminRoles";
import { buildMemberRatingPayload } from "@/lib/memberRatingPayload";
import { viewerProfileFlags } from "@/lib/memberProfileView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    const sessionUserId =
      session && (session.role === "MEMBER" || isStaffAdminRole(session.role))
        ? session.userId
        : null;
    const viewerRole = staffViewerRoleLabel(session?.role);
    const { viewerOwnsProfile, viewerIsAdmin } = viewerProfileFlags(
      session ? { userId: session.userId, role: session.role } : null,
      userId,
    );

    const rating = await buildMemberRatingPayload(prisma, userId, sessionUserId, {
      allowUnapprovedTarget: viewerOwnsProfile || viewerIsAdmin,
      viewerRole,
    });
    if (!rating) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    return NextResponse.json(rating);
  } catch (e) {
    console.error("[GET /api/members/.../rating]", e);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
