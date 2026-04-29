import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/adminGate";
import { isStaffAdminRole, isSuperAdminRole } from "@/lib/adminRoles";

const adminPaths = ["/admin", "/panel/admin", "/api/admin"];
const memberPaths = ["/panel/user", "/ads/new"];

function isAdminRoot(pathname: string) {
  return pathname === "/admin" || pathname === "/admin/";
}

/** Ana yönetici: yönetici ekip yönetimi (gate ile değil, oturum şart). */
function isSuperAdminOnlyPath(pathname: string) {
  return (
    pathname === "/admin/admins" ||
    pathname.startsWith("/admin/admins/") ||
    pathname === "/admin/signup-sms-provider" ||
    pathname.startsWith("/admin/signup-sms-provider/") ||
    pathname === "/api/admin/team" ||
    pathname.startsWith("/api/admin/team/") ||
    pathname === "/api/admin/signup-sms-provider" ||
    pathname.startsWith("/api/admin/signup-sms-provider/")
  );
}

async function hasAdminAccess(req: NextRequest): Promise<boolean> {
  const session = await getSessionFromRequest(req);
  if (isStaffAdminRole(session?.role)) return true;
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

export async function middleware(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));
  const isMemberPath = memberPaths.some((path) => pathname.startsWith(path));

  const isAdminGateApi = pathname === "/api/admin/gate" || pathname.startsWith("/api/admin/gate/");
  if (isAdminPath && !isAdminGateApi) {
    if (isAdminRoot(pathname)) {
      return nextWithRequestId(req, requestId);
    }
    if (isSuperAdminOnlyPath(pathname)) {
      if (!isSuperAdminRole(session?.role)) {
        if (pathname.startsWith("/api/admin")) {
          return jsonWithRequestId({ error: "Yetkisiz" }, 403, requestId);
        }
        return redirectWithRequestId(new URL("/admin", req.url), requestId);
      }
      return nextWithRequestId(req, requestId);
    }
    const ok = await hasAdminAccess(req);
    if (!ok) {
      if (pathname.startsWith("/api/admin")) {
        return jsonWithRequestId({ error: "Yetkisiz" }, 401, requestId);
      }
      const gate = new URL("/admin", req.url);
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
    return redirectWithRequestId(new URL("/admin", req.url), requestId);
  }

  return nextWithRequestId(req, requestId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
