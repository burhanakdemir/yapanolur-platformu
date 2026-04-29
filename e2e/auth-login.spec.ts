import { expect, test } from "@playwright/test";

test("gecersiz giris 401", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: {
      email: "yok-boyle-bir-kullanici@example.com",
      password: "yanlis",
    },
  });
  expect(res.status()).toBe(401);
  const j = (await res.json()) as { error?: string };
  expect(j.error).toBeTruthy();
});

test("login sayfasi acilir", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
