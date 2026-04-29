import { NextResponse } from "next/server";
import { ensureDefaultTopCategories, getCategoryTree } from "@/lib/categories";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";

function flatten(
  nodes: { id: string; name: string; children: { id: string; name: string; children: unknown[] }[] }[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth });
    out.push(...flatten(n.children as never, depth + 1));
  }
  return out;
}

export async function GET() {
  try {
    await ensureDefaultTopCategories();
    const tree = await getCategoryTree();
    return NextResponse.json({
      tree,
      flat: flatten(tree),
    });
  } catch (e) {
    if (e instanceof DatabaseConnectionError || isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Veritabanı bağlantısı yok." },
        { status: 503 },
      );
    }
    throw e;
  }
}
