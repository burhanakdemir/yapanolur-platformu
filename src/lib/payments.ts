import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";
import { getResolvedIyzicoConfig, getResolvedPaytrConfig } from "@/lib/paymentConfig";
import { buildPaytrGetTokenHmac, postPaytrGetToken } from "@/lib/paytrClient";
import crypto from "node:crypto";
type Provider = "iyzico" | "paytr";

export async function createPaymentOrder(params: {
  userId: string;
  provider: Provider;
  amountTry: number;
  callbackQuery?: Record<string, string>;
  userIp?: string;
}) {
  const providerCode = params.provider === "iyzico" ? "IYZICO" : "PAYTR";
  const externalRef = `${providerCode}-${Date.now()}`;
  const order = await prisma.paymentOrder.create({
    data: {
      userId: params.userId,
      provider: providerCode,
      amountTry: params.amountTry,
      status: "PENDING",
      externalRef,
    },
  });

  let paymentUrl = `/payments/simulate?orderId=${order.id}&provider=${params.provider}`;

  if (params.provider === "iyzico") {
    const iyzico = await initializeIyzicoCheckout({
      orderId: order.id,
      amountTry: params.amountTry,
      conversationId: externalRef,
      callbackQuery: params.callbackQuery,
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        providerPayload: JSON.stringify(iyzico),
      },
    });
    paymentUrl = `/payments/iyzico?orderId=${order.id}`;
  } else {
    try {
      const paytr = await initializePaytrCheckout({
        order,
        userIp: params.userIp,
        callbackQuery: params.callbackQuery,
      });
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          providerPayload: JSON.stringify(paytr),
          externalRef: order.id,
        },
      });
      paymentUrl = `/payments/paytr?orderId=${order.id}`;
    } catch (e) {
      await prisma.paymentOrder.delete({ where: { id: order.id } }).catch(() => {});
      throw e;
    }
  }
  return { orderId: order.id, paymentUrl };
}

type IyzicoInitResult = {
  status?: string;
  token?: string;
  checkoutFormContent?: string;
  errorMessage?: string;
};

async function getIyzicoConfig() {
  return getResolvedIyzicoConfig();
}

function buildIyzicoAuth(path: string, body: string, apiKey: string, secretKey: string) {
  const randomKey = crypto.randomUUID().replaceAll("-", "");
  const dataToSign = `${randomKey}${path}${body}`;
  const signature = crypto.createHmac("sha256", secretKey).update(dataToSign).digest("hex");
  const auth = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString("base64");
  return `IYZWSv2 ${auth}`;
}

async function callIyzico(path: string, payload: Record<string, unknown>) {
  const { apiKey, secretKey, baseUrl } = await getIyzicoConfig();
  const body = JSON.stringify(payload);
  const authorization = buildIyzicoAuth(path, body, apiKey, secretKey);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-iyzi-rnd": crypto.randomUUID().replaceAll("-", ""),
    },
    body,
    cache: "no-store",
  });
  return (await response.json()) as Record<string, unknown>;
}

async function initializeIyzicoCheckout(params: {
  orderId: string;
  amountTry: number;
  conversationId: string;
  callbackQuery?: Record<string, string>;
}) {
  const { appUrl } = await getIyzicoConfig();
  const amount = params.amountTry.toFixed(2);
  const callback = new URL(`${appUrl}/api/payments/iyzico/callback`);
  callback.searchParams.set("orderId", params.orderId);
  for (const [k, v] of Object.entries(params.callbackQuery || {})) {
    callback.searchParams.set(k, v);
  }
  const payload = {
    locale: "tr",
    conversationId: params.conversationId,
    price: amount,
    paidPrice: amount,
    currency: "TRY",
    basketId: params.orderId,
    paymentGroup: "PRODUCT",
    callbackUrl: callback.toString(),
    enabledInstallments: [1, 2, 3],
    buyer: {
      id: params.orderId,
      name: "Uye",
      surname: "Odeme",
      gsmNumber: "+905350000000",
      email: "user@example.com",
      identityNumber: "11111111111",
      registrationAddress: "Istanbul",
      ip: "85.34.78.112",
      city: "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: "Uye Odeme",
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul",
    },
    billingAddress: {
      contactName: "Uye Odeme",
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul",
    },
    basketItems: [
      {
        id: `credit-${params.orderId}`,
        name: "Kredi Yukleme",
        category1: "Digital",
        itemType: "VIRTUAL",
        price: amount,
      },
    ],
  };

  const result = (await callIyzico(
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    payload,
  )) as IyzicoInitResult;

  if (result.status !== "success") {
    throw new Error(result.errorMessage || "Iyzico baslatma hatasi");
  }
  return result;
}

export type PaytrProviderPayload = {
  kind: "paytr";
  iframeToken: string;
  callbackQuery?: Record<string, string>;
};

async function initializePaytrCheckout(params: {
  order: { id: string; amountTry: number; userId: string };
  userIp?: string;
  callbackQuery?: Record<string, string>;
}): Promise<PaytrProviderPayload> {
  const user = await prisma.user.findUnique({ where: { id: params.order.userId } });
  if (!user) {
    throw new Error("Odeme: kullanici bulunamadi.");
  }
  const cfg = await getResolvedPaytrConfig();
  const appUrl = getAppUrl();
  const userIp = (params.userIp || "85.0.0.0").replace(/[^\d.a-fA-F:]/g, "").slice(0, 45) || "127.0.0.1";
  const email = user.email;
  const merchantOid = params.order.id;
  const amountTry = params.order.amountTry;
  const paymentAmount = amountTry * 100;
  const basket = [["Kredi yukleme", amountTry.toFixed(2), 1]] as [string, string, number][];
  const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
  const noInst = 0;
  const maxInst = 0;
  const currency = "TL";
  const testMode = cfg.testMode ? 1 : 0;
  const paytrToken = buildPaytrGetTokenHmac(
    {
      merchantId: cfg.merchantId,
      userIp,
      merchantOid,
      email,
      paymentAmount,
      userBasket,
      noInstallment: noInst,
      maxInstallment: maxInst,
      currency,
      testMode,
    },
    cfg.merchantKey,
    cfg.merchantSalt,
  );

  const okUrl = new URL("/panel/user", appUrl);
  okUrl.searchParams.set("topup", "success");
  const failUrl = new URL("/panel/user/topup", appUrl);
  failUrl.searchParams.set("status", "failed");

  const form = new URLSearchParams();
  form.set("merchant_id", cfg.merchantId);
  form.set("user_ip", userIp);
  form.set("merchant_oid", merchantOid);
  form.set("email", email);
  form.set("payment_amount", String(paymentAmount));
  form.set("user_basket", userBasket);
  form.set("paytr_token", paytrToken);
  form.set("debug_on", process.env.NODE_ENV === "development" ? "1" : "0");
  form.set("no_installment", String(noInst));
  form.set("max_installment", String(maxInst));
  form.set("user_name", user.name?.trim() || user.email.split("@")[0] || "Uye");
  form.set("user_address", "Turkiye");
  form.set("user_phone", "5550000000");
  form.set("merchant_ok_url", okUrl.toString());
  form.set("merchant_fail_url", failUrl.toString());
  form.set("timeout_limit", "30");
  form.set("currency", currency);
  form.set("test_mode", String(testMode));
  form.set("lang", "tr");

  const res = await postPaytrGetToken(form);
  if (res.status !== "success" || !res.token) {
    const reason = typeof res.reason === "string" ? res.reason : JSON.stringify(res);
    throw new Error(`PayTR token alinamadi: ${reason}`);
  }
  return {
    kind: "paytr",
    iframeToken: res.token,
    callbackQuery: params.callbackQuery,
  };
}

export async function verifyIyzicoPayment(token: string, conversationId: string) {
  const payload = {
    locale: "tr",
    conversationId,
    token,
  };
  return (await callIyzico(
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    payload,
  )) as Record<string, unknown>;
}
