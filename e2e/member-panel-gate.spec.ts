import { expect, test } from "@playwright/test";

test("GET /panel/user oturumsuz kullaniciyi giris sayfasina yonlendirir", async ({ request }) => {
  const res = await request.get("/panel/user", { maxRedirects: 0 });
  expect([302, 307, 308]).toContain(res.status());
  const loc = res.headers().location ?? "";
  expect(loc).toMatch(/\/login/);
  expect(loc).toMatch(/next=/);
});
