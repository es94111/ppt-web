import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createDeckAccessToken, getClientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = rateLimit(`deck:${id}:${getClientIp(request)}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "嘗試次數過多" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = z.object({ password: z.string().min(1).max(128) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("請輸入密碼", 400);
  const deck = await db.deck.findUnique({ where: { id }, select: { passwordHash: true, visibility: true } });
  if (!deck) return jsonError("找不到簡報", 404);
  if (!deck.passwordHash || !(await bcrypt.compare(parsed.data.password, deck.passwordHash))) return jsonError("密碼錯誤", 401);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(`deck_access_${id}`, createDeckAccessToken(id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/`, maxAge: 7200 });
  return response;
}
