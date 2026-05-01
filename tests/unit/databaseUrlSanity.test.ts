import { describe, expect, it } from "vitest";
import {
  assertReasonableDatabaseUrl,
  DatabaseUrlSanityError,
  getPlaceholderDatabaseUrlIssue,
} from "@/lib/databaseUrlSanity";

describe("databaseUrlSanity", () => {
  it("flags tutorial x:y URL", () => {
    delete process.env.DATABASE_URL_ALLOW_PLACEHOLDER;
    expect(getPlaceholderDatabaseUrlIssue("postgresql://x:y@127.0.0.1:5432/x")).not.toBeNull();
    expect(() => assertReasonableDatabaseUrl("postgresql://x:y@127.0.0.1:5432/x")).toThrow(DatabaseUrlSanityError);
  });

  it("flags user x even if password differs", () => {
    delete process.env.DATABASE_URL_ALLOW_PLACEHOLDER;
    expect(getPlaceholderDatabaseUrlIssue("postgresql://x:secret@127.0.0.1:5432/mydb")).not.toBeNull();
  });

  it("allows docker-compose style URL", () => {
    delete process.env.DATABASE_URL_ALLOW_PLACEHOLDER;
    expect(() =>
      assertReasonableDatabaseUrl("postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev"),
    ).not.toThrow();
  });

  it("respects DATABASE_URL_ALLOW_PLACEHOLDER", () => {
    process.env.DATABASE_URL_ALLOW_PLACEHOLDER = "1";
    expect(() => assertReasonableDatabaseUrl("postgresql://x:y@127.0.0.1:5432/x")).not.toThrow();
    delete process.env.DATABASE_URL_ALLOW_PLACEHOLDER;
  });
});
