import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";
import { deckCreateSchema } from "@/lib/schemas";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const where = user.role === "ADMIN" ? {} : { OR: [{ ownerId: user.id }, { visibility: "PUBLIC" as const }] };
  const decks = await db.deck.findMany({ where, include: { owner: { select: { name: true, email: true } }, _count: { select: { slides: true, viewLogs: true } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(decks.map(({ passwordHash: _, ...deck }) => deck));
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (!(["ADMIN", "USER"] as string[]).includes(user.role)) return jsonError("沒有建立簡報的權限", 403);
  const parsed = deckCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("輸入資料不正確", 400, parsed.error.flatten());
  if (parsed.data.visibility === "PASSWORD") return jsonError("建立後請設定密碼再切換為密碼保護", 400);
  const deck = await db.deck.create({ data: { ...parsed.data, ownerId: user.id, slides: { create: { order: 1, content: { kind: "markdown", markdown: "# 新簡報\n\n開始用 Markdown 撰寫，用 `---` 分頁。" } } } }, include: { slides: true } });
  return NextResponse.json(deck, { status: 201 });
}
