import { describe, expect, it, vi } from "vitest";
import { getWelcomeBonusReferenceId, grantWelcomeBonusIfEligible } from "@/lib/welcomeBonus";

function makeDb(opts?: {
  enabled?: boolean;
  amountTry?: number;
  preexisting?: boolean;
}) {
  const rows: Array<{ id: string; userId: string; referenceId: string; amountTry: number }> = [];
  if (opts?.preexisting) {
    rows.push({
      id: "tx-existing",
      userId: "u1",
      referenceId: getWelcomeBonusReferenceId("u1"),
      amountTry: 500,
    });
  }

  const db = {
    adminSettings: {
      findUnique: vi.fn(async () => ({
        welcomeBonusEnabled: opts?.enabled ?? true,
        welcomeBonusAmountTry: opts?.amountTry ?? 500,
      })),
    },
    creditTransaction: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string; referenceId: string } }) => {
        const hit = rows.find((r) => r.userId === where.userId && r.referenceId === where.referenceId);
        return hit ? { id: hit.id } : null;
      }),
      create: vi.fn(async ({ data }: { data: { userId: string; referenceId: string; amountTry: number } }) => {
        const id = `tx-${rows.length + 1}`;
        rows.push({ id, ...data });
        return { id };
      }),
    },
    $queryRaw: vi.fn(async () => []),
    _rows: rows,
  };

  return db;
}

describe("grantWelcomeBonusIfEligible", () => {
  it("autoApprove=true senaryosunda bonusu bir kez yazar", async () => {
    const db = makeDb({ enabled: true, amountTry: 500 });
    const first = await grantWelcomeBonusIfEligible(db, "u1");
    const second = await grantWelcomeBonusIfEligible(db, "u1");

    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(db._rows).toHaveLength(1);
    expect(db._rows[0]?.amountTry).toBe(500);
  });

  it("admin onayinda ilk kez cagrildiginda bonus yazar", async () => {
    const db = makeDb({ enabled: true, amountTry: 500 });
    const result = await grantWelcomeBonusIfEligible(db, "u1");

    expect(result.granted).toBe(true);
    expect(db._rows).toHaveLength(1);
  });

  it("approve tekrarlarinda ikinci bonusu yazmaz", async () => {
    const db = makeDb({ enabled: true, amountTry: 500, preexisting: true });
    const result = await grantWelcomeBonusIfEligible(db, "u1");

    expect(result.granted).toBe(false);
    expect(db._rows).toHaveLength(1);
  });

  it("welcomeBonusEnabled=false iken bonus yazmaz", async () => {
    const db = makeDb({ enabled: false, amountTry: 500 });
    const result = await grantWelcomeBonusIfEligible(db, "u1");

    expect(result.granted).toBe(false);
    expect(db.creditTransaction.create).not.toHaveBeenCalled();
    expect(db._rows).toHaveLength(0);
  });
});
