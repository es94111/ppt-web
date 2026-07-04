import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { createShareAccessToken, isShareLinkActive, shareAccessCookieName } from "@/lib/share-links";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null) as { password?: string } | null;
  const link = await db.shareLink.findUnique({ where: { token }, include: { deck: { select: { id: true } } } });
  if (!link || !isShareLinkActive(link)) return jsonError("分享連結不存在或已失效", 404);
  if (!link.passwordHash) return NextResponse.json({ ok: true });
  if (!body?.password || !(await bcrypt.compare(body.password, link.passwordHash))) return jsonError("分享密碼錯誤", 403);
  const response = NextResponse.json({ ok: true });
  // 憑證綁定此分享連結 token，僅供 /s/[token] 使用，不會解鎖簡報自身的密碼閘。
  response.cookies.set(shareAccessCookieName(token), createShareAccessToken(token), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 2, path: `/s/${token}` });
  return response;
}
