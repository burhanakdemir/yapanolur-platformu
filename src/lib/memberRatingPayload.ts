import type { PrismaClient } from "@/generated/prisma/client";

import { computeMemberStarScore } from "@/lib/memberRating";

export type MemberRatingLiker = {
  id: string;
  memberNumber: number;
  name: string | null;
  /** Beğeni tarihi (ISO) */
  likedAt: string;
};

export type MemberRatingPayload = {
  docCount: number;
  likeCount: number;
  dislikeCount: number;
  score: number;
  myVote: "LIKE" | "DISLIKE" | null;
  canVote: boolean;
  isSelf: boolean;
  /** Beğeni veren üyeler (sıra: oy tarihi) */
  likers: MemberRatingLiker[];
};

export async function buildMemberRatingPayload(
  prisma: PrismaClient,
  targetUserId: string,
  sessionUserId: string | null,
  opts?: {
    allowUnapprovedTarget?: boolean;
    /** ADMIN: oy verebilir (üye onayı aranmaz). MEMBER: onaylı üye olmalı. */
    viewerRole?: "MEMBER" | "ADMIN" | null;
  },
): Promise<MemberRatingPayload | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      role: "MEMBER",
      ...(opts?.allowUnapprovedTarget ? {} : { isMemberApproved: true }),
    },
    select: {
      id: true,
      memberProfile: {
        select: { documents: { select: { id: true } } },
      },
    },
  });
  if (!user?.memberProfile) return null;

  const docCount = user.memberProfile.documents.length;

  let likeCount = 0;
  let dislikeCount = 0;
  const likers: MemberRatingLiker[] = [];
  const peer = prisma.memberPeerVote;
  if (peer && typeof peer.findMany === "function") {
    try {
      const votes = await peer.findMany({
        where: { toUserId: targetUserId },
        orderBy: { createdAt: "asc" },
        select: {
          type: true,
          createdAt: true,
          fromUser: { select: { id: true, memberNumber: true, name: true } },
        },
      });
      for (const v of votes) {
        if (v.type === "LIKE") {
          likeCount++;
          likers.push({
            ...v.fromUser,
            likedAt: v.createdAt.toISOString(),
          });
        } else if (v.type === "DISLIKE") {
          dislikeCount++;
        }
      }
    } catch (e) {
      console.error("[memberRatingPayload] memberPeerVote.findMany", e);
    }
  } else {
    console.warn(
      "[memberRatingPayload] memberPeerVote eksik (npx prisma generate && db push). Begeni sayilari 0.",
    );
  }

  const score = computeMemberStarScore(docCount, likeCount, dislikeCount);

  let myVote: "LIKE" | "DISLIKE" | null = null;
  let canVote = false;
  let isSelf = false;

  if (sessionUserId) {
    isSelf = sessionUserId === targetUserId;
    if (isSelf) {
      canVote = false;
    } else if (opts?.viewerRole === "ADMIN") {
      canVote = true;
    } else {
      const voter = await prisma.user.findFirst({
        where: { id: sessionUserId, role: "MEMBER", isMemberApproved: true },
        select: { id: true },
      });
      canVote = Boolean(voter);
    }
    if (canVote && peer && typeof peer.findFirst === "function") {
      try {
        const v = await peer.findFirst({
          where: { fromUserId: sessionUserId, toUserId: targetUserId },
          select: { type: true },
        });
        myVote = v?.type === "LIKE" || v?.type === "DISLIKE" ? v.type : null;
      } catch (e) {
        console.error("[memberRatingPayload] memberPeerVote.findFirst", e);
      }
    }
  }

  return {
    docCount,
    likeCount,
    dislikeCount,
    score,
    myVote,
    canVote,
    isSelf,
    likers,
  };
}
