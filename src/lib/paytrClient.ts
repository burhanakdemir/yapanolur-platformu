import crypto from "node:crypto";

const GET_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";

export function buildPaytrGetTokenHmac(
  params: {
    merchantId: string;
    userIp: string;
    merchantOid: string;
    email: string;
    paymentAmount: number; // kuruş
    userBasket: string; // base64
    noInstallment: number;
    maxInstallment: number;
    currency: string;
    testMode: number;
  },
  merchantKey: string,
  merchantSalt: string,
): string {
  const hashStr = `${params.merchantId}${params.userIp}${params.merchantOid}${params.email}${params.paymentAmount}${params.userBasket}${params.noInstallment}${params.maxInstallment}${params.currency}${params.testMode}`;
  return crypto.createHmac("sha256", merchantKey).update(hashStr + merchantSalt).digest("base64");
}

export function verifyPaytrCallbackHash(
  merchantKey: string,
  merchantSalt: string,
  post: { merchant_oid: string; status: string; total_amount: string; hash: string },
): boolean {
  const hashStr = post.merchant_oid + merchantSalt + post.status + post.total_amount;
  const expect = crypto.createHmac("sha256", merchantKey).update(hashStr).digest("base64");
  return expect === post.hash;
}

export async function postPaytrGetToken(
  form: URLSearchParams,
): Promise<{ status: string; token?: string; reason?: string; [k: string]: unknown }> {
  const response = await fetch(GET_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  return (await response.json()) as { status: string; token?: string; reason?: string };
}
