import { describe, expect, it, afterEach, vi } from "vitest";
import { parseMemberWorkExperienceBody } from "@/lib/memberWorkExperienceValidation";
import { formatMemberWorkDuration } from "@/lib/memberWorkDuration";
import { isAllowedUploadUrl } from "@/lib/uploadUrl";

describe("memberWorkExperienceValidation", () => {
  it("parseMemberWorkExperienceBody rejects oversize title", () => {
    const res = parseMemberWorkExperienceBody({
      title: "x".repeat(201),
      description: "y",
      province: "Ankara",
      district: "Çankaya",
      durationYears: 0,
      durationMonths: 0,
      durationDays: 5,
      professionId: "prof1",
      categoryId: "cat1",
    });
    expect(res.success).toBe(false);
  });

  it("parseMemberWorkExperienceBody accepts minimal payload", () => {
    const res = parseMemberWorkExperienceBody({
      title: "Proje",
      description: "Kisa aciklama",
      province: "Ankara",
      district: "Çankaya",
      durationYears: 0,
      durationMonths: 0,
      durationDays: 20,
      professionId: "ckmfakeprofessionid0001",
      categoryId: "ckmfakecategoryid00000000001",
      imageUrls: [],
    });
    expect(res.success).toBe(true);
  });

  it("parseMemberWorkExperienceBody accepts production S3 URL under /uploads/", () => {
    const s3Url =
      "https://myapp-uploads.s3.eu-central-1.amazonaws.com/uploads/file-abc123.jpg";
    expect(isAllowedUploadUrl(s3Url)).toBe(true);
    const res = parseMemberWorkExperienceBody({
      title: "Proje",
      description: "Kisa aciklama",
      province: "Ankara",
      district: "Çankaya",
      durationYears: 0,
      durationMonths: 0,
      durationDays: 20,
      professionId: "ckmfakeprofessionid0001",
      categoryId: "ckmfakecategoryid00000000001",
      imageUrls: [s3Url],
    });
    expect(res.success).toBe(true);
  });

  it("parseMemberWorkExperienceBody accepts S3_PUBLIC_BASE_URL prefix when set", () => {
    vi.stubEnv("S3_PUBLIC_BASE_URL", "https://cdn.example.com/assets");
    const customUrl = "https://cdn.example.com/assets/uploads/x.webp";
    expect(isAllowedUploadUrl(customUrl)).toBe(true);
    const res = parseMemberWorkExperienceBody({
      title: "Proje",
      description: "Kisa aciklama",
      province: "Ankara",
      district: "Çankaya",
      durationYears: 0,
      durationMonths: 0,
      durationDays: 20,
      professionId: "ckmfakeprofessionid0001",
      categoryId: "ckmfakecategoryid00000000001",
      imageUrls: [customUrl],
    });
    expect(res.success).toBe(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseMemberWorkExperienceBody rejects all-zero duration", () => {
    const res = parseMemberWorkExperienceBody({
      title: "Proje",
      description: "Kisa aciklama",
      province: "Ankara",
      district: "Çankaya",
      durationYears: 0,
      durationMonths: 0,
      durationDays: 0,
      professionId: "ckmfakeprofessionid0001",
      categoryId: "ckmfakecategoryid00000000001",
    });
    expect(res.success).toBe(false);
  });
});

describe("formatMemberWorkDuration", () => {
  it("omits zero units", () => {
    expect(formatMemberWorkDuration("tr", 0, 0, 20)).toBe("20 gün");
    expect(formatMemberWorkDuration("tr", 1, 2, 3)).toBe("1 yıl 2 ay 3 gün");
    expect(formatMemberWorkDuration("tr", 0, 2, 0)).toBe("2 ay");
  });

  it("english pluralization", () => {
    expect(formatMemberWorkDuration("en", 0, 0, 1)).toBe("1 day");
    expect(formatMemberWorkDuration("en", 0, 0, 2)).toBe("2 days");
  });
});
