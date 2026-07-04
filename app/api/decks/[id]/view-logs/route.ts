import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOwnedDeck, jsonError, requireUser } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  // 瀏覽紀錄含觀看者 email／IP，屬擁有者專屬分析，不開放 EDITOR 協作者。
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const [logs, total] = await db.$transaction([
    db.viewLog.findMany({ where: { deckId: id }, include: { user: { select: { name: true, email: true } } }, orderBy: { viewedAt: "desc" }, skip: (page - 1) * 50, take: 50 }),
    db.viewLog.count({ where: { deckId: id } })
  ]);
  return NextResponse.json({ logs, total, page });
}
