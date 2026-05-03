import { describe, expect, it } from "vitest";
import { shouldSendPeerVoteEmail } from "@/lib/memberProfileVoteNotifyPolicy";

describe("shouldSendPeerVoteEmail", () => {
  it("clear never notifies", () => {
    expect(shouldSendPeerVoteEmail("clear", null)).toBe(false);
    expect(shouldSendPeerVoteEmail("clear", { type: "LIKE" })).toBe(false);
  });

  it("like notifies when no vote or was dislike", () => {
    expect(shouldSendPeerVoteEmail("like", null)).toBe(true);
    expect(shouldSendPeerVoteEmail("like", { type: "DISLIKE" })).toBe(true);
    expect(shouldSendPeerVoteEmail("like", { type: "LIKE" })).toBe(false);
  });

  it("dislike notifies when no vote or was like", () => {
    expect(shouldSendPeerVoteEmail("dislike", null)).toBe(true);
    expect(shouldSendPeerVoteEmail("dislike", { type: "LIKE" })).toBe(true);
    expect(shouldSendPeerVoteEmail("dislike", { type: "DISLIKE" })).toBe(false);
  });
});
