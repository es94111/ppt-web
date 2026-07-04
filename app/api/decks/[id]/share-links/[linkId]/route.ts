import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOwnedDeck, jsonError, requireUser } from "@/lib/http";

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, linkId } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const link = await db.shareLink.findFirst({ where: { id: linkId, deckId: id } });
  if (!link) return jsonError("找不到分享連結", 404);
  await db.shareLink.update({ where: { id: linkId }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
