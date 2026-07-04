import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, hasDeckCookie, jsonError, requireUser } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { viewSchema } from "@/lib/schemas";
import { isShareLinkActive, shareAccessCookieName, verifyShareAccessToken } from "@/lib/share-links";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); // 可為 null（匿名）
  const { id } = await params;
  const ip = getClientIp(request);
  if (!(await rateLimit(`view:${user?.id ?? "anon"}:${id}:${ip}`, 120, 60_000)).allowed) return jsonError("請求過於頻繁", 429);
  const parsed = viewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("頁碼不正確", 400);
  const deck = await db.deck.findUnique({ where: { id }, include: { collaborators: { where: { userId: user?.id ?? "__anonymous__" }, select: { role: true } } } });
  if (!deck) return jsonError("找不到簡報", 404);
  const shareLink = parsed.data.shareToken ? await db.shareLink.findUnique({ where: { token: parsed.data.shareToken } }) : null;
  if (parsed.data.shareToken && (!shareLink || shareLink.deckId !== id || !isShareLinkActive(shareLink))) return jsonError("分享連結無效", 403);
  if (shareLink?.passwordHash && !verifyShareAccessToken(shareLink.token, request.cookies.get(shareAccessCookieName(shareLink.token))?.value)) return jsonError("需要分享密碼", 403);
  const owns = !!user && (user.role === "ADMIN" || deck.ownerId === user.id);
  const collaborates = !!user && deck.collaborators.length > 0;
  const viaShare = !!shareLink;
  if (deck.visibility === "PRIVATE" && !owns && !collaborates && !viaShare) return jsonError("沒有權限", 403);
  if (deck.visibility === "AUTHENTICATED" && !user && !viaShare) return jsonError("請先登入", 401);
  if (deck.passwordHash && !owns && !viaShare && !hasDeckCookie(request, id)) return jsonError("需要簡報密碼", 403);
  await db.viewLog.create({ data: { deckId: id, shareLinkId: shareLink?.id ?? null, userId: user?.id ?? null, slideOrder: parsed.data.slideOrder, ipAddress: ip.slice(0, 64), userAgent: request.headers.get("user-agent")?.slice(0, 1000), referer: request.headers.get("referer")?.slice(0, 2000) } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
