import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { buildIletiHashDiagnostics } from "@/lib/iletMerkeziDiagnostics";
import {
  getIletiJsonCredentialSource,
  resolveIletiMerkeziJsonCredentials,
} from "@/lib/iletMerkeziJsonSms";
import { senderHintMask } from "@/lib/iletMerkeziRedact";

export const dynamic = "force-dynamic";

async function requireSuperAdminApi() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    return NextResponse.json(
      { error: "Bu işlem yalnızca süper yönetici içindir." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Hash önizlemesi + kimlik kaynağı. Tam anahtar / gizli / tam hash dönülmez.
 */
export async function GET() {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  const source = await getIletiJsonCredentialSource(prisma);
  const creds = await resolveIletiMerkeziJsonCredentials(prisma);
  if (!creds) {
    return NextResponse.json(
      {
        ok: false,
        credentialSource: source,
        error: "Kayıtlı kimlik yok. Panelde üç alan dolu olsun veya ILETI_MERKEZI_USER / ILETI_MERKEZI_PASS / ILETI_MERKEZI_SENDER env tanımlanmış olsun.",
      },
      { status: 400 },
    );
  }

  const hashDiagnostics = buildIletiHashDiagnostics(creds.user, creds.pass);
  return NextResponse.json({
    ok: true,
    credentialSource: source,
    senderHint: senderHintMask(creds.sender),
    hashDiagnostics,
    hint: "hashPrefix8, dışta HMAC-SHA256 (key=gizli anahtar, message=API anahtarı) hex çıktısının ilk 8 karakteriyle eşleşmelidir. 401/üyelik hatası genelde yanlış çift, API izni veya IP kısıtıdır.",
  });
}
