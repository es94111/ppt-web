import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

// 查詢簡報狀態（主要供 PPTX 轉檔輪詢：PROCESSING / READY / FAILED）
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, select: { ownerId: true, sourceType: true, status: true, _count: { select: { slides: true } } } });
  if (!deck) return jsonError("找不到簡報", 404);
  if (user.role !== "ADMIN" && deck.ownerId !== user.id) return jsonError("沒有權限", 403);
  return NextResponse.json({ sourceType: deck.sourceType, status: deck.status, slideCount: deck._count.slides });
}
