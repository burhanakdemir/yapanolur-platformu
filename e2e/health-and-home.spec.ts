import { expect, test } from "@playwright/test";

test("GET /api/health veritabani ile 200", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const j = (await res.json()) as { ok?: boolean };
  expect(j.ok).toBe(true);
});

test("ana sayfa yuklenir", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
});
