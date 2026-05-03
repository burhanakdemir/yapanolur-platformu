/** Veritabanı + JWT ile uyumlu roller */
export type AppUserRole = "MEMBER" | "ADMIN" | "SUPER_ADMIN";

/** Yönetici paneli erişimi (ana + yardımcı yöneticiler) */
export const MAX_ADMIN_TEAM_SIZE = 100;

/** Ana yönetici (SUPER_ADMIN) üst sınırı: tek kurulum + en fazla 5 ek ana yönetici */
export const MAX_SUPER_ADMIN_ACCOUNTS = 6;

export function isStaffAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

/** Arayüz teması: süper yönetici / yardımcı (ADMIN) / yalnızca panel şifresi */
export type AdminPanelMode = "super" | "staff" | "panel";

export function getAdminPanelMode(role: string | undefined | null): AdminPanelMode {
  if (isSuperAdminRole(role)) return "super";
  if (role === "ADMIN") return "staff";
  return "panel";
}

/** Üye profili / puan API yüklerinde kullanılan görüntüleyici rol etiketi (staff → ADMIN). */
export function staffViewerRoleLabel(
  role: string | undefined | null,
): "ADMIN" | "MEMBER" | null {
  if (isStaffAdminRole(role)) return "ADMIN";
  if (role === "MEMBER") return "MEMBER";
  return null;
}
