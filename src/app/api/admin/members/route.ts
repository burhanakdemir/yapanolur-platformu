import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const memberSelect = {
  id: true,
  memberNumber: true,
  email: true,
  name: true,
  password: true,
  profilePhotoUrl: true,
  isMemberApproved: true,
  createdAt: true,
  memberProfile: {
    select: {
      phone: true,
      province: true,
      district: true,
      profession: { select: { name: true } },
      _count: { select: { documents: true } },
    },
  },
} satisfies Prisma.UserSelect;

export async function GET(req: Request) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";
  const memberNoRaw = searchParams.get("memberNo")?.trim() ?? "";
  const phoneRaw = searchParams.get("phone")?.trim() ?? "";

  const baseWhere: Prisma.UserWhereInput =
    status === "pending"
      ? { role: "MEMBER" as const, isMemberApproved: false }
      : status === "approved"
        ? { role: "MEMBER" as const, isMemberApproved: true }
        : { role: "MEMBER" as const };

  const andParts: Prisma.UserWhereInput[] = [baseWhere];

  /** PostgreSQL: Prisma `contains` → LIKE; varsayılan yerelde büyük/küçük harf duyarlı */
  if (q.length > 0) {
    andParts.push({
      OR: [{ email: { contains: q } }, { name: { contains: q } }],
    });
  }

  const memberNoDigits = memberNoRaw.replace(/\D/g, "");
  if (memberNoDigits.length > 0) {
    const n = Number.parseInt(memberNoDigits, 10);
    if (Number.isFinite(n) && n >= 1) {
      andParts.push({ memberNumber: n });
    }
  }

  if (phoneRaw.length > 0) {
    const trimmed = phoneRaw.trim();
    const digitsOnly = trimmed.replace(/\D/g, "");
    const phoneClauses: Prisma.UserWhereInput[] = [
      { memberProfile: { is: { phone: { contains: trimmed } } } },
    ];
    if (digitsOnly.length >= 3 && digitsOnly !== trimmed) {
      phoneClauses.push({ memberProfile: { is: { phone: { contains: digitsOnly } } } });
    }
    andParts.push(phoneClauses.length === 1 ? phoneClauses[0]! : { OR: phoneClauses });
  }

  const where: Prisma.UserWhereInput =
    andParts.length === 1 ? andParts[0]! : { AND: andParts };

  const takeRaw = Number.parseInt(searchParams.get("take") ?? "80", 10);
  const skipRaw = Number.parseInt(searchParams.get("skip") ?? "0", 10);
  const take = Math.min(200, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 80));
  const skip = Math.max(0, Number.isFinite(skipRaw) ? skipRaw : 0);

  /** Üye numarası büyükten küçüğe (yeni kayıtlar daha yüksek numara alır). Belgeler liste için yüklenmez; ayrı GET ile alınır. */
  const [rows, totalFiltered, totalMemberCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: memberSelect,
      orderBy: { memberNumber: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: "MEMBER" } }),
  ]);

  const members = rows.map((u) => {
    const mp = u.memberProfile;
    if (!mp) {
      return { ...u, memberProfile: null };
    }
    const { _count, ...rest } = mp;
    return {
      ...u,
      memberProfile: {
        ...rest,
        documentCount: _count.documents,
      },
    };
  });

  return NextResponse.json({ members, totalMemberCount, totalFiltered, skip, take });
}
