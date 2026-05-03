import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { SupportConversation, SupportMessage } from "@/generated/prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { SUPPORT_MAX_MESSAGES_PER_CONV_PER_HOUR, SUPPORT_VISITOR_COOKIE } from "@/lib/supportConstants";
import {
  canCreateNewConversationForVisitorKey,
  countVisitorMessagesInLastHour,
} from "@/lib/supportRateLimit";
import { maybeNotifyStaffOffline } from "@/lib/supportNotify";

const GUEST_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeGuestEmail(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim().slice(0, 320);
  return t.length > 0 ? t : null;
}

function isValidGuestEmail(email: string): boolean {
  return email.length <= 320 && GUEST_EMAIL_RE.test(email);
}

function generateVisitorKey(): string {
  return randomBytes(20).toString("hex");
}

async function findActiveConversation(
  session: SessionPayload | null,
  visitorKey: string | null,
): Promise<SupportConversation | null> {
  if (session?.role === "MEMBER") {
    const c = await prisma.supportConversation.findFirst({
      where: { userId: session.userId, status: { not: "KAPALI" } },
      orderBy: { updatedAt: "desc" },
    });
    if (c) return c;
  }
  if (visitorKey) {
    const c = await prisma.supportConversation.findUnique({
      where: { visitorKey },
    });
    if (c && c.status === "KAPALI") return null;
    return c;
  }
  return null;
}

export function visitorCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

function serializeMessage(m: SupportMessage) {
  return {
    id: m.id,
    body: m.body,
    sender: m.sender,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeThread(
  c: SupportConversation,
  messages: SupportMessage[],
) {
  return {
    id: c.id,
    status: c.status,
    userId: c.userId,
    guestEmail: c.guestEmail,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messages: messages.map(serializeMessage),
  };
}

type PostThreadBody = { body: string; guestEmail?: string | null; forceNew?: boolean };

export async function handleSupportThreadPost(
  req: NextRequest,
  session: SessionPayload | null,
  body: PostThreadBody,
): Promise<
  | { ok: true; data: { thread: ReturnType<typeof serializeThread>; setCookie: string | null } }
  | { ok: false; status: number; error: string }
> {
  if (isStaffAdminRole(session?.role)) {
    return { ok: false, status: 403, error: "Yönetici sohbet widget’ı bu oturumla kullanmaz; panel: Canlı destek." };
  }

  const text = (body.body ?? "").trim();
  if (text.length < 1) {
    return { ok: false, status: 400, error: "Mesaj gerekli." };
  }
  if (text.length > 4000) {
    return { ok: false, status: 400, error: "Mesaj çok uzun." };
  }

  const guestEmailNorm = normalizeGuestEmail(body.guestEmail);

  const keyFromCookie = req.cookies.get(SUPPORT_VISITOR_COOKIE)?.value?.trim() || null;
  const forceNew = Boolean(body.forceNew);
  const memberProvince =
    session?.role === "MEMBER"
      ? (
          await prisma.memberProfile.findUnique({
            where: { userId: session.userId },
            select: { province: true },
          })
        )?.province?.trim() || null
      : null;

  const existing = !forceNew
    ? await findActiveConversation(session, keyFromCookie)
    : null;

  if (existing) {
    const anonVisitor = !existing.userId && session?.role !== "MEMBER";
    const storedEmail = normalizeGuestEmail(existing.guestEmail);
    const effectiveGuest = guestEmailNorm ?? storedEmail;
    if (anonVisitor) {
      if (!effectiveGuest || !isValidGuestEmail(effectiveGuest)) {
        return {
          ok: false,
          status: 400,
          error: "Anonim ziyaretçiler için geçerli bir e-posta adresi zorunludur.",
        };
      }
    }
    const n = await countVisitorMessagesInLastHour(existing.id);
    if (n >= SUPPORT_MAX_MESSAGES_PER_CONV_PER_HOUR) {
      return { ok: false, status: 429, error: "Çok fazla mesaj gönderildi. Bir süre sonra tekrar deneyin." };
    }
    await prisma.supportMessage.create({
      data: {
        conversationId: existing.id,
        sender: "VISITOR",
        body: text,
        authorUserId: session?.role === "MEMBER" ? session.userId : null,
        authorAdminId: null,
      },
    });
    const updated = await prisma.supportConversation.update({
      where: { id: existing.id },
      data: {
        status: "NEEDS_RESPONSE",
        lastVisitorMessageAt: new Date(),
        ...(session?.role === "MEMBER" && !existing.province && memberProvince
          ? { province: memberProvince }
          : {}),
        guestEmail: anonVisitor
          ? effectiveGuest
          : guestEmailNorm ?? storedEmail ?? undefined,
        ...(session?.role === "MEMBER" && !existing.userId
          ? { userId: session.userId }
          : {}),
      },
    });
    const all = await prisma.supportMessage.findMany({
      where: { conversationId: existing.id },
      orderBy: { createdAt: "asc" },
    });
    await maybeNotifyStaffOffline({
      conversation: updated,
      isNewConversation: false,
      reason: "visitor_message",
    });
    return {
      ok: true,
      data: { thread: serializeThread(updated, all), setCookie: null },
    };
  }

  // Yeni sohbet
  if (session?.role === "MEMBER") {
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.supportConversation.create({
        data: {
          visitorKey: null,
          userId: session.userId,
          province: memberProvince,
          guestEmail: null,
          status: "NEEDS_RESPONSE",
        },
      });
      await tx.supportMessage.create({
        data: {
          conversationId: c.id,
          sender: "VISITOR",
          body: text,
          authorUserId: session.userId,
        },
      });
      return c;
    });
    const c = created;
    const updated = await prisma.supportConversation.update({
      where: { id: c.id },
      data: { lastVisitorMessageAt: new Date() },
    });
    const all = await prisma.supportMessage.findMany({
      where: { conversationId: c.id },
      orderBy: { createdAt: "asc" },
    });
    await maybeNotifyStaffOffline({ conversation: updated, isNewConversation: true, reason: "new" });
    return { ok: true, data: { thread: serializeThread(updated, all), setCookie: null } };
  }

  if (!guestEmailNorm || !isValidGuestEmail(guestEmailNorm)) {
    return {
      ok: false,
      status: 400,
      error: "Anonim ziyaretçiler için geçerli bir e-posta adresi zorunludur.",
    };
  }

  const vk = keyFromCookie ?? generateVisitorKey();
  if (keyFromCookie) {
    const okNew = await canCreateNewConversationForVisitorKey(vk);
    if (!okNew) {
      return {
        ok: false,
        status: 429,
        error: "Bu tarayıcıdan bugün yeni sohbet sınırına ulaşıldı. Mevcut sohbetinizden devam edin veya yarın tekrar deneyin.",
      };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.supportConversation.create({
      data: {
        visitorKey: vk,
        userId: null,
        guestEmail: guestEmailNorm,
        status: "NEEDS_RESPONSE",
      },
    });
    await tx.supportMessage.create({
      data: {
        conversationId: c.id,
        sender: "VISITOR",
        body: text,
      },
    });
    return c;
  });
  const all = await prisma.supportMessage.findMany({
    where: { conversationId: created.id },
    orderBy: { createdAt: "asc" },
  });
  const after = await prisma.supportConversation.update({
    where: { id: created.id },
    data: { lastVisitorMessageAt: new Date() },
  });
  await maybeNotifyStaffOffline({ conversation: after, isNewConversation: true, reason: "new" });

  const setCookie = keyFromCookie ? null : vk;
  return {
    ok: true,
    data: {
      thread: serializeThread(after, all),
      setCookie,
    },
  };
}

export async function handleSupportThreadGet(
  session: SessionPayload | null,
  req: NextRequest,
): Promise<
  { ok: true; data: { thread: ReturnType<typeof serializeThread> } | { thread: null } }
  | { ok: false; status: number; error: string }
> {
  if (isStaffAdminRole(session?.role)) {
    return { ok: true, data: { thread: null } };
  }
  const key = req.cookies.get(SUPPORT_VISITOR_COOKIE)?.value?.trim() || null;
  const c = await findActiveConversation(session, key);
  if (!c) {
    return { ok: true, data: { thread: null } };
  }
  const all = await prisma.supportMessage.findMany({
    where: { conversationId: c.id },
    orderBy: { createdAt: "asc" },
  });
  await prisma.supportConversation.update({
    where: { id: c.id },
    data: { lastReadByVisitorAt: new Date() },
  });
  return { ok: true, data: { thread: serializeThread(c, all) } };
}