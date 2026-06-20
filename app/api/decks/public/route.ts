import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 列出全部公開簡報（PUBLIC + READY）。對匿名（未登入）開放，只回傳安全欄位。
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const sort = searchParams.get("sort") === "popular" ? "popular" : "recent";
  const decks = await db.deck.findMany({
    where: { visibility: "PUBLIC", status: "READY", ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    select: { id: true, title: true, description: true, sourceType: true, updatedAt: true, owner: { select: { name: true } }, _count: { select: { slides: true, viewLogs: true } } },
    orderBy: sort === "popular" ? { viewLogs: { _count: "desc" } } : { updatedAt: "desc" },
    take: 60,
  });
  return NextResponse.json(decks);
}
