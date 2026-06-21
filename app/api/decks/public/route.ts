import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 列出全部公開簡報。PASSWORD 是舊資料相容值，新資料使用 PUBLIC + passwordHash。
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const sort = searchParams.get("sort") === "popular" ? "popular" : "recent";
  const decks = await db.deck.findMany({
    where: { visibility: { in: ["PUBLIC", "PASSWORD"] }, status: "READY", ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    select: { id: true, title: true, description: true, sourceType: true, updatedAt: true, passwordHash: true, owner: { select: { name: true } }, _count: { select: { slides: true, viewLogs: true } } },
    orderBy: sort === "popular" ? { viewLogs: { _count: "desc" } } : { updatedAt: "desc" },
    take: 60,
  });
  return NextResponse.json(decks.map(({ passwordHash, ...deck }) => ({ ...deck, isPasswordProtected: !!passwordHash })));
}
