import { expect, test } from "@playwright/test";

test("iyzico callback orderId yoksa 400", async ({ request }) => {
  const res = await request.post("/api/payments/iyzico/callback", {
    multipart: {
      token: "",
    },
  });
  expect(res.status()).toBe(400);
});

test("iyzico callback token yoksa 400", async ({ request }) => {
  const url = new URL("/api/payments/iyzico/callback", "http://localhost:3000");
  url.searchParams.set("orderId", "test-order-missing-in-db");
  const res = await request.post(url.toString(), {
    multipart: {
      token: "",
    },
  });
  expect(res.status()).toBe(400);
});
