import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const verifySessionTokenMock = vi.fn();
const prismaMock = {
  ad: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  profession: {
    update: vi.fn(),
    delete: vi.fn(),
  },
  memberComment: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  memberPeerVote: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  bid: {
    count: vi.fn(),
  },
  paymentOrder: {
    count: vi.fn(),
  },
};

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth", () => ({
  verifySessionToken: verifySessionTokenMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/revalidateCategoryRoutes", () => ({
  revalidateCategoryRoutes: vi.fn(),
}));

describe("admin api auth guards", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    verifySessionTokenMock.mockReset();
    prismaMock.ad.count.mockReset();
    prismaMock.ad.findMany.mockReset();
    prismaMock.category.findUnique.mockReset();
    prismaMock.category.update.mockReset();
    prismaMock.category.count.mockReset();
    prismaMock.category.delete.mockReset();
    prismaMock.profession.update.mockReset();
    prismaMock.profession.delete.mockReset();
    prismaMock.memberComment.findUnique.mockReset();
    prismaMock.memberComment.delete.mockReset();
    prismaMock.memberPeerVote.findUnique.mockReset();
    prismaMock.memberPeerVote.delete.mockReset();
    prismaMock.bid.count.mockReset();
    prismaMock.paymentOrder.count.mockReset();
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    });
    verifySessionTokenMock.mockResolvedValue(null);
  });

  it("GET /api/admin/members yetkisizde 403", async () => {
    const { GET } = await import("@/app/api/admin/members/route");
    const res = await GET(new Request("http://localhost/api/admin/members"));
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/members/:id/credit yetkisizde 403", async () => {
    const { POST } = await import("@/app/api/admin/members/[id]/credit/route");
    const res = await POST(
      new Request("http://localhost/api/admin/members/u1/credit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountTry: 100 }),
      }),
      { params: Promise.resolve({ id: "u1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("DELETE /api/admin/member-comments/:commentId yetkisizde 403", async () => {
    const { DELETE } = await import("@/app/api/admin/member-comments/[commentId]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/member-comments/c1"), {
      params: Promise.resolve({ commentId: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/admin/member-votes/:voteId yetkisizde 403", async () => {
    const { DELETE } = await import("@/app/api/admin/member-votes/[voteId]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/member-votes/v1"), {
      params: Promise.resolve({ voteId: "v1" }),
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/stats yetkisizde 403", async () => {
    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET(new Request("http://localhost/api/admin/stats"));
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/categories yetkisizde 403", async () => {
    const { POST } = await import("@/app/api/admin/categories/route");
    const res = await POST(
      new Request("http://localhost/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/professions/:id yetkisizde 403", async () => {
    const { PATCH } = await import("@/app/api/admin/professions/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/professions/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Yeni Meslek" }),
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/category-image yetkisizde 403", async () => {
    const { POST } = await import("@/app/api/admin/category-image/route");
    const res = await POST(new Request("http://localhost/api/admin/category-image", { method: "POST" }));
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/stats admin rolde 200 ve sayaclari dondurur", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.local",
      role: "ADMIN",
    });
    prismaMock.ad.count.mockResolvedValue(3);
    prismaMock.bid.count.mockResolvedValue(7);
    prismaMock.paymentOrder.count.mockResolvedValue(2);

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET(new Request("http://localhost/api/admin/stats?range=7d"));
    const data = (await res.json()) as {
      pendingAds: number;
      bidCount: number;
      paidOrders: number;
    };

    expect(res.status).toBe(200);
    expect(data.pendingAds).toBe(3);
    expect(data.bidCount).toBe(7);
    expect(data.paidOrders).toBe(2);
  });

  it("GET /api/admin/ads admin rolde 200 ve limitli liste dondurur", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.local",
      role: "ADMIN",
    });
    prismaMock.ad.findMany.mockResolvedValue([{ id: "ad-1" }, { id: "ad-2" }]);

    const { GET } = await import("@/app/api/admin/ads/route");
    const res = await GET(new Request("http://localhost/api/admin/ads?status=pending&take=5"));
    const data = (await res.json()) as Array<{ id: string }>;

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(prismaMock.ad.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      }),
    );
  });

  it("GET /api/admin/stats super admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "super-1",
      email: "super@test.local",
      role: "SUPER_ADMIN",
    });
    prismaMock.ad.count.mockResolvedValue(1);
    prismaMock.bid.count.mockResolvedValue(1);
    prismaMock.paymentOrder.count.mockResolvedValue(1);

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET(new Request("http://localhost/api/admin/stats"));
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/stats member rolde 403 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "member-1",
      email: "member@test.local",
      role: "MEMBER",
    });

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET(new Request("http://localhost/api/admin/stats"));
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/ads member rolde 403 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "member-1",
      email: "member@test.local",
      role: "MEMBER",
    });

    const { GET } = await import("@/app/api/admin/ads/route");
    const res = await GET(new Request("http://localhost/api/admin/ads"));
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/categories/:id admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.local",
      role: "ADMIN",
    });
    prismaMock.category.findUnique.mockResolvedValue({ id: "cat-1" });
    prismaMock.category.update.mockResolvedValue({
      id: "cat-1",
      name: "Yeni Kategori",
      imageUrl: null,
    });

    const { PATCH } = await import("@/app/api/admin/categories/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/categories/cat-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Yeni Kategori" }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("PATCH /api/admin/categories/:id member rolde 403 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "member-1",
      email: "member@test.local",
      role: "MEMBER",
    });

    const { PATCH } = await import("@/app/api/admin/categories/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/categories/cat-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Yeni Kategori" }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/professions/:id super admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "super-1",
      email: "super@test.local",
      role: "SUPER_ADMIN",
    });
    prismaMock.profession.update.mockResolvedValue({
      id: "prof-1",
      name: "Insaat Muhendisi",
      sortOrder: 1,
    });

    const { PATCH } = await import("@/app/api/admin/professions/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/professions/prof-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Insaat Muhendisi", sortOrder: 1 }),
      }),
      { params: Promise.resolve({ id: "prof-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("PATCH /api/admin/professions/:id member rolde 403 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "member-1",
      email: "member@test.local",
      role: "MEMBER",
    });

    const { PATCH } = await import("@/app/api/admin/professions/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/admin/professions/prof-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Insaat Muhendisi" }),
      }),
      { params: Promise.resolve({ id: "prof-1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("DELETE /api/admin/professions/:id admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.local",
      role: "ADMIN",
    });
    prismaMock.profession.delete.mockResolvedValue({ id: "prof-1" });

    const { DELETE } = await import("@/app/api/admin/professions/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/professions/prof-1"), {
      params: Promise.resolve({ id: "prof-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/professions/:id member rolde 403 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "member-1",
      email: "member@test.local",
      role: "MEMBER",
    });

    const { DELETE } = await import("@/app/api/admin/professions/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/professions/prof-1"), {
      params: Promise.resolve({ id: "prof-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/admin/member-comments/:commentId admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.local",
      role: "ADMIN",
    });
    prismaMock.memberComment.findUnique.mockResolvedValue({ id: "c1" });
    prismaMock.memberComment.delete.mockResolvedValue({ id: "c1" });

    const { DELETE } = await import("@/app/api/admin/member-comments/[commentId]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/member-comments/c1"), {
      params: Promise.resolve({ commentId: "c1" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/admin/member-votes/:voteId super admin rolde 200 doner", async () => {
    verifySessionTokenMock.mockResolvedValue({
      userId: "super-1",
      email: "super@test.local",
      role: "SUPER_ADMIN",
    });
    prismaMock.memberPeerVote.findUnique.mockResolvedValue({ id: "v1" });
    prismaMock.memberPeerVote.delete.mockResolvedValue({ id: "v1" });

    const { DELETE } = await import("@/app/api/admin/member-votes/[voteId]/route");
    const res = await DELETE(new Request("http://localhost/api/admin/member-votes/v1"), {
      params: Promise.resolve({ voteId: "v1" }),
    });
    expect(res.status).toBe(200);
  });
});
