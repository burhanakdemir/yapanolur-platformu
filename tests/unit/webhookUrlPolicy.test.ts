import { describe, expect, it } from "vitest";
import { isAllowedWebhookUrl, isBlockedWebhookHostname } from "@/lib/webhookUrlPolicy";

describe("webhookUrlPolicy", () => {
  it("blocks localhost and private IPs", () => {
    expect(isBlockedWebhookHostname("localhost")).toBe(true);
    expect(isBlockedWebhookHostname("127.0.0.1")).toBe(true);
    expect(isBlockedWebhookHostname("10.0.0.5")).toBe(true);
    expect(isBlockedWebhookHostname("192.168.1.1")).toBe(true);
  });

  it("allows public https in development", () => {
    expect(isAllowedWebhookUrl("https://hooks.example.com/path")).toBe(true);
    expect(isAllowedWebhookUrl("http://127.0.0.1/hook")).toBe(false);
    expect(isAllowedWebhookUrl("http://hooks.example.com/hook")).toBe(true);
  });
});
