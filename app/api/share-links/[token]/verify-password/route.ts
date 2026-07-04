import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createShareAccessToken, isShareLinkActive, shareAccessCookieName } from "@/lib/share-links";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limit = await rateLimit(`share-password:${token}:${getClientIp(request)}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "嘗試次數過多" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = z.object({ password: z.string().min(1).max(128) }).safeParse(await request.json().catch(() => null));
  const link = await db.shareLink.findUnique({ where: { token }, include: { deck: { select: { id: true } } } });
  if (!link || !isShareLinkActive(link)) return jsonError("分享連結不存在或已失效", 404);
  if (!link.passwordHash) return NextResponse.json({ ok: true });
  if (!parsed.success || !(await bcrypt.compare(parsed.data.password, link.passwordHash))) return jsonError("分享密碼錯誤", 403);
  const response = NextResponse.json({ ok: true });
  // 憑證綁定此分享連結 token，僅供 /s/[token] 使用，不會解鎖簡報自身的密碼閘。
  response.cookies.set(shareAccessCookieName(token), createShareAccessToken(token), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 2, path: `/s/${token}` });
  return response;
}
