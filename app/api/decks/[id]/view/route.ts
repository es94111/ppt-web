import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, hasDeckCookie, jsonError, requireUser } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { viewSchema } from "@/lib/schemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const ip = getClientIp(request);
  if (!rateLimit(`view:${user.id}:${id}:${ip}`, 120, 60_000).allowed) return jsonError("請求過於頻繁", 429);
  const parsed = viewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("頁碼不正確", 400);
  const deck = await db.deck.findUnique({ where: { id }, select: { ownerId: true, visibility: true } });
  if (!deck) return jsonError("找不到簡報", 404);
  const owns = user.role === "ADMIN" || deck.ownerId === user.id;
  if (deck.visibility === "PRIVATE" && !owns) return jsonError("沒有權限", 403);
  if (deck.visibility === "PASSWORD" && !owns && !hasDeckCookie(request, id)) return jsonError("需要簡報密碼", 403);
  await db.viewLog.create({ data: { deckId: id, userId: user.id, slideOrder: parsed.data.slideOrder, ipAddress: ip.slice(0, 64), userAgent: request.headers.get("user-agent")?.slice(0, 1000), referer: request.headers.get("referer")?.slice(0, 2000) } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
