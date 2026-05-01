import type { CreditTransactionType, PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDaysYmd,
  eachDayYmdInRange,
  eachMonthYmInRange,
  EXEC_MAX_DAILY_TREND_BUCKETS,
  istCalendarDaysInclusive,
  istYmdNow,
  type ExecutivePeriod,
  parseExecutivePeriod,
  parseTrendWindow,
  rangeCustomFromToToday,
  rangeForPeriod,
  trendRangeDays,
  type IstRange,
} from "@/lib/executive/istanbulCalendar";

function envThreshold(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const CREDIT_TYPE_LABEL: Record<CreditTransactionType, string> = {
  TOP_UP: "Kredi yükleme",
  BID_FEE: "Teklif ücreti",
  REFUND: "İade",
  AD_FEE: "İlan ücreti",
  ADJUSTMENT: "Düzeltme",
  DETAIL_VIEW_FEE: "İlan detay ücreti",
  BID_ACCESS_FEE: "Teklif erişim ücreti",
  MEMBER_CONTACT_FEE: "Üye iletişim ücreti",
  MEMBER_COMMENT_FEE: "Profil yorum ücreti",
  MEMBER_COMMENT_REPLY_FEE: "Yorum yanıt ücreti",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Bekleyen",
  PAID: "Ödendi",
  FAILED: "Başarısız",
};

export type ExecutiveAlert = {
  severity: "warning" | "info";
  title: string;
  detail: string;
};

export type ExecutiveDashboardData = {
  /** URL / seçimle uyumlu; geçersiz özel tarihte `month` olabilir. */
  period: ExecutivePeriod;
  periodRange: IstRange;
  /** Özel aralıkta başlangıç YYYY-MM-DD; değilse null */
  customFromYmd: string | null;
  /** Geçersiz özel tarih vb. */
  notice: string | null;
  /** Son X gün mü, yoksa özel aralık mı */
  trendKind: "rolling" | "custom_range";
  /** `rolling` iken dolu */
  rollingTrendDays: 30 | 90 | null;
  trendGranularity: "day" | "month";
  /** Grafik ve tablo ekseni (YYYY-MM-DD veya YYYY-MM) */
  trendBucketKeys: string[];
  trendDisplayTitle: string;
  /** Özet kartları */
  newMembers: number;
  pendingMembers: number;
  newAds: number;
  pendingAds: number;
  publishedAds: number;
  bidCount: number;
  bidsDistinctAds: number;
  creditTopUpSumTry: number;
  creditByType: { type: CreditTransactionType; label: string; sumTry: number }[];
  paymentByStatus: { status: PaymentStatus; label: string; count: number }[];
  pendingCreditInvoices: number;
  failedPaymentsInPeriod: number;
  alerts: ExecutiveAlert[];
  newMembersSeries: number[];
  creditTopUpSeriesTry: number[];
  topProvincesByAds: { province: string; count: number }[];
  topProvincesByMembers: { province: string; count: number }[];
};

async function loadAlerts(
  pendingAds: number,
  pendingMembers: number,
  pendingInvoices: number,
  failedPayments: number,
): Promise<ExecutiveAlert[]> {
  const minAds = envThreshold("EXEC_ALERT_PENDING_ADS_MIN", 1);
  const minMembers = envThreshold("EXEC_ALERT_PENDING_MEMBERS_MIN", 1);
  const minInvoices = envThreshold("EXEC_ALERT_PENDING_INVOICES_MIN", 1);

  const alerts: ExecutiveAlert[] = [];
  if (pendingAds >= minAds) {
    alerts.push({
      severity: "warning",
      title: "İlan onayı bekliyor",
      detail: `${pendingAds} ilan yayıma alınmayı bekliyor. Operasyon panelinden inceleyebilirsiniz.`,
    });
  }
  if (pendingMembers >= minMembers) {
    alerts.push({
      severity: "warning",
      title: "Üye onayı bekliyor",
      detail: `${pendingMembers} üye başvurusu onay veya red bekliyor.`,
    });
  }
  if (pendingInvoices >= minInvoices) {
    alerts.push({
      severity: "info",
      title: "E-fatura talebi kuyruğu",
      detail: `${pendingInvoices} kredi yükleme için e-belge talebi onay bekliyor.`,
    });
  }
  if (failedPayments > 0) {
    alerts.push({
      severity: "warning",
      title: "Başarısız ödeme (seçilen dönem)",
      detail: `${failedPayments} ödeme kaydı başarısız olarak işaretlendi.`,
    });
  }
  return alerts;
}

export async function getExecutiveDashboardData(searchParams: {
  period?: string;
  trend?: string;
  from?: string;
}): Promise<ExecutiveDashboardData> {
  const rawPeriod = parseExecutivePeriod(searchParams.period);
  const fromRaw = searchParams.from?.trim() ?? "";
  const trendWindow = parseTrendWindow(searchParams.trend);
  const todayYmd = istYmdNow();

  let notice: string | null = null;
  let effectivePeriod: ExecutivePeriod = rawPeriod;
  let customFromYmd: string | null = null;
  let periodRange: IstRange;
  let trendStart: Date;
  let trendEndExclusive: Date;
  let trendGranularity: "day" | "month";
  let trendBucketKeys: string[];
  let trendKind: "rolling" | "custom_range";
  let rollingTrendDays: 30 | 90 | null = null;
  let trendDisplayTitle = "";

  if (rawPeriod === "custom") {
    const custom = fromRaw ? rangeCustomFromToToday(fromRaw) : null;
    if (!custom) {
      notice = fromRaw
        ? "Başlangıç tarihi geçersiz veya gelecekte. Özet bu ay olarak gösteriliyor."
        : "Özel dönem için başlangıç tarihi seçin veya aşağıdaki tarihi kullanın. Şimdilik bu ay gösteriliyor.";
      effectivePeriod = "month";
      periodRange = rangeForPeriod("month");
      trendKind = "rolling";
      rollingTrendDays = trendWindow;
      const tr = trendRangeDays(trendWindow);
      trendStart = tr.start;
      trendEndExclusive = tr.endExclusive;
      trendGranularity = "day";
      const rollStartYmd = istYmdNow(tr.start);
      trendBucketKeys = [];
      for (let i = 0; i < trendWindow; i++) {
        trendBucketKeys.push(addCalendarDaysYmd(rollStartYmd, i));
      }
      trendDisplayTitle = `Son ${trendWindow} gün (günlük)`;
    } else {
      customFromYmd = fromRaw;
      effectivePeriod = "custom";
      periodRange = custom;
      trendKind = "custom_range";
      rollingTrendDays = null;
      trendStart = periodRange.start;
      trendEndExclusive = periodRange.endExclusive;
      const spanDays = istCalendarDaysInclusive(fromRaw, todayYmd);
      if (spanDays <= EXEC_MAX_DAILY_TREND_BUCKETS) {
        trendGranularity = "day";
        trendBucketKeys = eachDayYmdInRange(fromRaw, todayYmd);
        trendDisplayTitle = `${periodRange.label} (günlük)`;
      } else {
        trendGranularity = "month";
        trendBucketKeys = eachMonthYmInRange(fromRaw, todayYmd);
        trendDisplayTitle = `${periodRange.label} (aylık)`;
      }
    }
  } else {
    effectivePeriod = rawPeriod;
    periodRange = rangeForPeriod(rawPeriod);
    trendKind = "rolling";
    rollingTrendDays = trendWindow;
    const tr = trendRangeDays(trendWindow);
    trendStart = tr.start;
    trendEndExclusive = tr.endExclusive;
    trendGranularity = "day";
    const rollStartYmd = istYmdNow(tr.start);
    trendBucketKeys = [];
    for (let i = 0; i < trendWindow; i++) {
      trendBucketKeys.push(addCalendarDaysYmd(rollStartYmd, i));
    }
    trendDisplayTitle = `Son ${trendWindow} gün (günlük)`;
  }

  const rangeWhere = {
    gte: periodRange.start,
    lt: periodRange.endExclusive,
  };

  const trendWhere = { gte: trendStart, lt: trendEndExclusive };

  const [memberTrendRows, topUpTrendRows] =
    trendGranularity === "day"
      ? await Promise.all([
          prisma.$queryRaw<Array<{ k: string; c: bigint }>>`
            SELECT to_char(("createdAt" AT TIME ZONE 'Europe/Istanbul')::date, 'YYYY-MM-DD') AS k,
              COUNT(*)::bigint AS c
            FROM "User"
            WHERE role = 'MEMBER'
              AND "createdAt" >= ${trendWhere.gte}
              AND "createdAt" < ${trendWhere.lt}
            GROUP BY 1 ORDER BY 1
          `,
          prisma.$queryRaw<Array<{ k: string; s: bigint }>>`
            SELECT to_char(("createdAt" AT TIME ZONE 'Europe/Istanbul')::date, 'YYYY-MM-DD') AS k,
              COALESCE(SUM("amountTry"), 0)::bigint AS s
            FROM "CreditTransaction"
            WHERE type = 'TOP_UP'
              AND "createdAt" >= ${trendWhere.gte}
              AND "createdAt" < ${trendWhere.lt}
            GROUP BY 1 ORDER BY 1
          `,
        ])
      : await Promise.all([
          prisma.$queryRaw<Array<{ k: string; c: bigint }>>`
            SELECT to_char(
              date_trunc('month', ("createdAt" AT TIME ZONE 'Europe/Istanbul')),
              'YYYY-MM'
            ) AS k,
              COUNT(*)::bigint AS c
            FROM "User"
            WHERE role = 'MEMBER'
              AND "createdAt" >= ${trendWhere.gte}
              AND "createdAt" < ${trendWhere.lt}
            GROUP BY 1 ORDER BY 1
          `,
          prisma.$queryRaw<Array<{ k: string; s: bigint }>>`
            SELECT to_char(
              date_trunc('month', ("createdAt" AT TIME ZONE 'Europe/Istanbul')),
              'YYYY-MM'
            ) AS k,
              COALESCE(SUM("amountTry"), 0)::bigint AS s
            FROM "CreditTransaction"
            WHERE type = 'TOP_UP'
              AND "createdAt" >= ${trendWhere.gte}
              AND "createdAt" < ${trendWhere.lt}
            GROUP BY 1 ORDER BY 1
          `,
        ]);

  const memberMap = new Map<string, number>();
  for (const row of memberTrendRows) {
    memberMap.set(row.k, Number(row.c));
  }
  const topUpMap = new Map<string, number>();
  for (const row of topUpTrendRows) {
    topUpMap.set(row.k, Number(row.s));
  }

  const newMembersSeries = trendBucketKeys.map((k) => memberMap.get(k) ?? 0);
  const creditTopUpSeriesTry = trendBucketKeys.map((k) => topUpMap.get(k) ?? 0);

  const [
    newMembers,
    pendingMembers,
    newAds,
    pendingAds,
    publishedAds,
    bidCount,
    bidsDistinctAds,
    creditAgg,
    creditGroups,
    paymentGroups,
    pendingCreditInvoices,
    failedPaymentsInPeriod,
    provinceAds,
    provinceMembers,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: "MEMBER", createdAt: rangeWhere },
    }),
    prisma.user.count({
      where: { role: "MEMBER", isMemberApproved: false },
    }),
    prisma.ad.count({ where: { createdAt: rangeWhere } }),
    prisma.ad.count({ where: { status: "PENDING" } }),
    prisma.ad.count({ where: { status: "APPROVED" } }),
    prisma.bid.count({ where: { createdAt: rangeWhere } }),
    prisma
      .$queryRaw<[{ c: bigint }]>`
        SELECT COUNT(DISTINCT "adId")::bigint AS c FROM "Bid"
        WHERE "createdAt" >= ${rangeWhere.gte} AND "createdAt" < ${rangeWhere.lt}
      `.then((r) => Number(r[0]?.c ?? 0)),
    prisma.creditTransaction.aggregate({
      where: { type: "TOP_UP", createdAt: rangeWhere },
      _sum: { amountTry: true },
    }),
    prisma.creditTransaction.groupBy({
      by: ["type"],
      where: { createdAt: rangeWhere },
      _sum: { amountTry: true },
    }),
    prisma.paymentOrder.groupBy({
      by: ["status"],
      where: { createdAt: rangeWhere },
      _count: { _all: true },
    }),
    prisma.creditInvoiceRequest.count({
      where: { status: "PENDING_APPROVAL" },
    }),
    prisma.paymentOrder.count({
      where: { createdAt: rangeWhere, status: "FAILED" },
    }),
    prisma.ad
      .groupBy({
        by: ["province"],
        where: {
          createdAt: { gte: trendWhere.gte, lt: trendWhere.lt },
          NOT: { province: "" },
        },
        _count: { _all: true },
      })
      .then((rows) =>
        [...rows].sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0)).slice(0, 10),
      ),
    prisma.memberProfile
      .groupBy({
        by: ["province"],
        where: { province: { not: null }, NOT: { province: "" } },
        _count: { _all: true },
      })
      .then((rows) =>
        [...rows]
          .filter((r) => r.province)
          .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
          .slice(0, 10),
      ),
  ]);

  const creditByType = creditGroups
    .map((g) => ({
      type: g.type,
      label: CREDIT_TYPE_LABEL[g.type],
      sumTry: g._sum.amountTry ?? 0,
    }))
    .sort((a, b) => b.sumTry - a.sumTry);

  const paymentByStatus = paymentGroups.map((g) => ({
    status: g.status,
    label: PAYMENT_STATUS_LABEL[g.status],
    count: g._count._all,
  }));

  const alerts = await loadAlerts(
    pendingAds,
    pendingMembers,
    pendingCreditInvoices,
    failedPaymentsInPeriod,
  );

  return {
    period: effectivePeriod,
    periodRange,
    customFromYmd,
    notice,
    trendKind,
    rollingTrendDays,
    trendGranularity,
    trendBucketKeys,
    trendDisplayTitle,
    newMembers,
    pendingMembers,
    newAds,
    pendingAds,
    publishedAds,
    bidCount,
    bidsDistinctAds,
    creditTopUpSumTry: creditAgg._sum.amountTry ?? 0,
    creditByType,
    paymentByStatus,
    pendingCreditInvoices,
    failedPaymentsInPeriod,
    alerts,
    newMembersSeries,
    creditTopUpSeriesTry,
    topProvincesByAds: provinceAds.map((r) => ({
      province: r.province || "—",
      count: r._count._all ?? 0,
    })),
    topProvincesByMembers: provinceMembers.map((r) => ({
      province: (r.province as string) || "—",
      count: r._count._all ?? 0,
    })),
  };
}
