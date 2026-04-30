import type { SessionPayload } from "@/lib/auth";
import { getAdminAllowedProvinces, isAdminProvinceScopingEnabled } from "@/lib/adminProvinceScope";

export default async function AdminStaffScopeBanner({ session }: { session: SessionPayload }) {
  if (!isAdminProvinceScopingEnabled()) return null;
  const scope = await getAdminAllowedProvinces(session);
  if (!scope.enabled) return null;

  const detail = scope.hasAllProvinces
    ? "Tüm illere erişiminiz vardır."
    : scope.provinces.length > 0
      ? `${scope.provinces.length} il: ${scope.provinces.join(", ")}`
      : "Henüz il atanmadı; süper yöneticiden yetki isteyin.";

  return (
    <div className="rounded-xl border border-teal-400/70 bg-teal-50/95 px-4 py-3 text-sm text-teal-950 shadow-sm">
      <strong className="font-semibold">İl / bölge yetkisi:</strong>{" "}
      <span className="text-teal-900/95">{detail}</span>
    </div>
  );
}
