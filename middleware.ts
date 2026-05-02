import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/adminGate";
import { isStaffAdminRole, isSuperAdminRole } from "@/lib/adminRoles";
import { ADMIN_MFA_PENDING_COOKIE, verifyAdminMfaPendingToken } from "@/lib/adminMfaPending";
import { adminBrowserPathToInternal, adminUrl } from "@/lib/adminUrls";
import { effectiveAdminBrowserPrefixForPathname } from "@/lib/adminPanelPathEnv";

const memberPaths = ["/panel/user", "/ads/new"];

function isAdminRootInternal(internalPath: string) {
  return internalPath === "/admin" || internalPath === "/admin/";
}

/** Ana yönetici: yönetici ekip yönetimi (gate ile değil, oturum şart). */
function isSuperAdminOnlyPathInternal(internalPath: string) {
  return (
    internalPath === "/admin/admins" ||
    internalPath.startsWith("/admin/admins/") ||
    internalPath === "/admin/sponsor-hero" ||
    internalPath.startsWith("/admin/sponsor-hero/") ||
    internalPath === "/admin/signup-sms-provider" ||
    internalPath.startsWith("/admin/signup-sms-provider/") ||
    internalPath === "/admin/signup-verification" ||
    internalPath.startsWith("/admin/signup-verification/") ||
    internalPath === "/api/admin/team" ||
    internalPath.startsWith("/api/admin/team/") ||
    internalPath === "/api/admin/sponsor-hero" ||
    internalPath.startsWith("/api/admin/sponsor-hero/") ||
    internalPath === "/api/admin/signup-sms-provider" ||
    internalPath.startsWith("/api/admin/signup-sms-provider/")
  );
}

async function hasAdminAccess(req: NextRequest): Promise<boolean> {
  const session = await getSessionFromRequest(req);
  if (isStaffAdminRole(session?.role)) {
    return session?.adminTotp === true;
  }
  const gate = req.cookies.get(ADMIN_GATE_COOKIE)?.value;
  return verifyAdminGateToken(gate);
}

function getOrCreateRequestId(req: NextRequest): string {
  return req.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}

function withRequestId(req: NextRequest, requestId: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  return requestHeaders;
}

function nextWithRequestId(req: NextRequest, requestId: string) {
  const res = NextResponse.next({
    request: { headers: withRequestId(req, requestId) },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

function redirectWithRequestId(url: URL, requestId: string) {
  const res = NextResponse.redirect(url);
  res.headers.set("x-request-id", requestId);
  return res;
}

function jsonWithRequestId(body: unknown, status: number, requestId: string) {
  const res = NextResponse.json(body, { status });
  res.headers.set("x-request-id", requestId);
  return res;
}

/** Önek kullanılıyorsa /a/yonetici → /admin rewrite; aksi halde next(). */
function finalize(req: NextRequest, requestId: string, pathname: string, internalPath: string) {
  const prefix = effectiveAdminBrowserPrefixForPathname(pathname);
  const rewrite =
    Boolean(prefix) &&
    (pathname === prefix ||
      pathname === `${prefix}/` ||
      (prefix && pathname.startsWith(`${prefix}/`)));
  if (rewrite) {
    const u = req.nextUrl.clone();
    u.pathname = internalPath;
    const res = NextResponse.rewrite(u);
    res.headers.set("x-request-id", requestId);
    return res;
  }
  return nextWithRequestId(req, requestId);
}

export async function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  const internalPath = adminBrowserPathToInternal(pathname);

  if (
    pathname.startsWith("/api/auth/admin-totp") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/admin/gate" ||
    pathname === "/api/auth/logout"
  ) {
    return nextWithRequestId(req, requestId);
  }

  const pendingRaw = req.cookies.get(ADMIN_MFA_PENDING_COOKIE)?.value;
  const pendingOk = pendingRaw ? await verifyAdminMfaPendingToken(pendingRaw) : null;
  const staffNeedTotp =
    session && isStaffAdminRole(session.role) && session.adminTotp !== true;
  const pendingFlow = Boolean(pendingOk && !session);

  if (staffNeedTotp || pendingFlow) {
    const allow =
      isAdminRootInternal(internalPath) ||
      pathname.startsWith("/api/auth/admin-totp");
    if (allow) {
      return finalize(req, requestId, pathname, internalPath);
    }
    if (pathname.startsWith("/api/admin")) {
      return jsonWithRequestId({ error: "Yönetici doğrulama (TOTP) gerekli." }, 403, requestId);
    }
    if (internalPath.startsWith("/admin") || pathname.startsWith("/panel/admin")) {
      return redirectWithRequestId(new URL(adminUrl(), req.url), requestId);
    }
  }

  const isAdminPath =
    internalPath.startsWith("/admin") ||
    pathname.startsWith("/panel/admin") ||
    pathname.startsWith("/api/admin");
  const isMemberPath = memberPaths.some((path) => pathname.startsWith(path));

  const isAdminGateApi = pathname === "/api/admin/gate" || pathname.startsWith("/api/admin/gate/");
  if (isAdminPath && !isAdminGateApi) {
    if (isAdminRootInternal(internalPath)) {
      return finalize(req, requestId, pathname, internalPath);
    }
    if (isSuperAdminOnlyPathInternal(internalPath)) {
      if (!isSuperAdminRole(session?.role) || session?.adminTotp !== true) {
        if (pathname.startsWith("/api/admin")) {
          return jsonWithRequestId({ error: "Yetkisiz" }, 403, requestId);
        }
        return redirectWithRequestId(new URL(adminUrl(), req.url), requestId);
      }
      return finalize(req, requestId, pathname, internalPath);
    }
    const ok = await hasAdminAccess(req);
    if (!ok) {
      if (pathname.startsWith("/api/admin")) {
        return jsonWithRequestId({ error: "Yetkisiz" }, 401, requestId);
      }
      const gate = new URL(adminUrl(), req.url);
      gate.searchParams.set("next", pathname + req.nextUrl.search);
      return redirectWithRequestId(gate, requestId);
    }
  }

  if (isMemberPath && !session) {
    if (pathname.startsWith("/ads/new")) {
      return redirectWithRequestId(new URL("/members?next=/ads/new", req.url), requestId);
    }
    return redirectWithRequestId(new URL("/login?next=/panel/user", req.url), requestId);
  }
  if (pathname.startsWith("/ads/new") && session?.role !== "MEMBER") {
    return redirectWithRequestId(new URL(adminUrl(), req.url), requestId);
  }

  return finalize(req, requestId, pathname, internalPath);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
