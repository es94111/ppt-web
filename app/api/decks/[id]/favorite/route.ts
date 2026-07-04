import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";
import { favoriteSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const parsed = favoriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("收藏狀態不正確", 400, parsed.error.flatten());
  const deck = await db.deck.findUnique({ where: { id }, select: { id: true, visibility: true, ownerId: true } });
  if (!deck) return jsonError("找不到簡報", 404);
  if (!["PUBLIC", "PASSWORD", "AUTHENTICATED"].includes(deck.visibility) && deck.ownerId !== user.id && user.role !== "ADMIN") return jsonError("沒有權限", 403);
  if (parsed.data.favorite) {
    await db.favorite.upsert({ where: { userId_deckId: { userId: user.id, deckId: id } }, update: {}, create: { userId: user.id, deckId: id } });
  } else {
    await db.favorite.deleteMany({ where: { userId: user.id, deckId: id } });
  }
  return NextResponse.json({ favorite: parsed.data.favorite });
}
