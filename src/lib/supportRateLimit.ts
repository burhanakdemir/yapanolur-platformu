import { prisma } from "@/lib/prisma";
import { SUPPORT_MAX_NEW_CONV_PER_KEY_PER_DAY } from "@/lib/supportConstants";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export async function countVisitorMessagesInLastHour(
  conversationId: string,
): Promise<number> {
  const since = new Date(Date.now() - HOUR_MS);
  return prisma.supportMessage.count({
    where: {
      conversationId,
      sender: "VISITOR",
      createdAt: { gte: since },
    },
  });
}

export async function canCreateNewConversationForVisitorKey(
  visitorKey: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DAY_MS);
  const n = await prisma.supportConversation.count({
    where: {
      visitorKey,
      createdAt: { gte: since },
    },
  });
  return n < SUPPORT_MAX_NEW_CONV_PER_KEY_PER_DAY;
}
