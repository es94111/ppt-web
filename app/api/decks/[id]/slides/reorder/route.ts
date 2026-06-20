import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  const parsed = z.object({ slideIds: z.array(z.string()).min(1).max(500) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data?.slideIds).size !== parsed.data?.slideIds.length) return jsonError("排序資料不正確", 400);
  const existing = await db.slide.findMany({ where: { deckId: id }, select: { id: true } });
  if (existing.length !== parsed.data.slideIds.length || existing.some(s => !parsed.data.slideIds.includes(s.id))) return jsonError("排序清單不完整", 400);
  await db.$transaction([
    ...parsed.data.slideIds.map((slideId, i) => db.slide.update({ where: { id: slideId }, data: { order: -(i + 1) } })),
    ...parsed.data.slideIds.map((slideId, i) => db.slide.update({ where: { id: slideId }, data: { order: i + 1 } }))
  ]);
  return NextResponse.json({ ok: true });
}
