import type { SessionPayload } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";

type ScopeDecision = {
  enabled: boolean;
  isSuperAdmin: boolean;
  hasAllProvinces: boolean;
  provinces: string[];
};

export function isAdminProvinceScopingEnabled(): boolean {
  return process.env.ADMIN_PROVINCE_SCOPING_ENABLED === "1";
}

function normalizeProvinceName(v: string): string {
  return v.trim();
}

export async function resolveAdminProvinceDecision(
  session: SessionPayload | null,
): Promise<ScopeDecision> {
  const enabled = isAdminProvinceScopingEnabled();
  const isSuper = isSuperAdminRole(session?.role);
  if (!enabled || !session || isSuper || session.role !== "ADMIN") {
    return {
      enabled,
      isSuperAdmin: isSuper,
      hasAllProvinces: true,
      provinces: [],
    };
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      hasAllProvinces: true,
      adminProvinceAccesses: {
        select: { province: true },
      },
    },
  });
  if (!admin) {
    return {
      enabled,
      isSuperAdmin: false,
      hasAllProvinces: false,
      provinces: [],
    };
  }

  const provinces = admin.adminProvinceAccesses
    .map((p) => normalizeProvinceName(p.province))
    .filter(Boolean);

  const unassignedMode = (process.env.ADMIN_PROVINCE_UNASSIGNED_MODE ?? "all").toLowerCase();
  const fallbackHasAll = provinces.length === 0 && unassignedMode === "all";

  return {
    enabled,
    isSuperAdmin: false,
    hasAllProvinces: admin.hasAllProvinces || fallbackHasAll,
    provinces,
  };
}

export async function canAdminAccessProvince(
  session: SessionPayload | null,
  province: string | null | undefined,
): Promise<boolean> {
  const scope = await resolveAdminProvinceDecision(session);
  if (!scope.enabled || scope.isSuperAdmin || scope.hasAllProvinces) return true;
  const includeNullProvince = (process.env.ADMIN_PROVINCE_INCLUDE_NULL_CONVERSATIONS ?? "0") === "1";
  const normalized = typeof province === "string" ? normalizeProvinceName(province) : "";
  if (!normalized) return includeNullProvince;
  return scope.provinces.includes(normalized);
}

export async function getAdminAllowedProvinces(
  session: SessionPayload | null,
): Promise<{
  enabled: boolean;
  hasAllProvinces: boolean;
  provinces: string[];
}> {
  const scope = await resolveAdminProvinceDecision(session);
  return {
    enabled: scope.enabled,
    hasAllProvinces: scope.hasAllProvinces || scope.isSuperAdmin,
    provinces: scope.provinces,
  };
}

export async function supportConversationProvinceWhere(
  session: SessionPayload | null,
): Promise<object | undefined> {
  const scope = await resolveAdminProvinceDecision(session);
  if (!scope.enabled || scope.isSuperAdmin || scope.hasAllProvinces) return undefined;
  const includeNullProvince = (process.env.ADMIN_PROVINCE_INCLUDE_NULL_CONVERSATIONS ?? "0") === "1";
  if (scope.provinces.length === 0) {
    return includeNullProvince ? { province: null } : { id: "__none__" };
  }
  if (includeNullProvince) {
    return {
      OR: [{ province: { in: scope.provinces } }, { province: null }],
    };
  }
  return { province: { in: scope.provinces } };
}
