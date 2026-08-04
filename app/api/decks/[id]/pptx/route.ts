import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser, verifyDeckAccessToken } from "@/lib/http";
import { isShareLinkActive, shareAccessCookieName, verifyShareAccessToken } from "@/lib/share-links";
import { getS3Config, readPptxSource } from "@/lib/pptx";

export const runtime = "nodejs";

function safeFileName(title: string) {
  const base = title.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/^\.+|\.+$/g, "").slice(0, 100) || "presentation";
  return `${base}.pptx`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const deck = await db.deck.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      ownerId: true,
      visibility: true,
      passwordHash: true,
      sourceType: true,
      sourceFile: true,
      status: true,
      collaborators: { where: { userId: user?.id ?? "__anonymous__" }, select: { role: true } },
    },
  });
  if (!deck) return jsonError("找不到簡報", 404);

  const shareToken = request.nextUrl.searchParams.get("shareToken");
  if (shareToken) {
    const link = await db.shareLink.findUnique({ where: { token: shareToken }, select: { deckId: true, passwordHash: true, expiresAt: true, revokedAt: true } });
    if (!link || link.deckId !== id || !isShareLinkActive(link)) return jsonError("分享連結不存在或已失效", 404);
    if (link.passwordHash && !verifyShareAccessToken(shareToken, request.cookies.get(shareAccessCookieName(shareToken))?.value)) return jsonError("需要分享密碼", 403);
  } else {
    const owns = !!user && (user.role === "ADMIN" || deck.ownerId === user.id);
    const collaborates = !!user && deck.collaborators.length > 0;
    if (deck.visibility === "PRIVATE" && !owns && !collaborates) return jsonError(user ? "沒有權限" : "請先登入", user ? 403 : 401);
    if (deck.visibility === "AUTHENTICATED" && !user) return jsonError("請先登入", 401);
    if (deck.passwordHash && !owns && !verifyDeckAccessToken(id, request.cookies.get(`deck_access_${id}`)?.value)) return jsonError("需要簡報密碼", 403);
  }

  if (deck.sourceType !== "PPTX" || !deck.sourceFile || !deck.sourceFile.startsWith(`decks/${id}/source/`)) return jsonError("找不到 PPTX 原始檔", 404);
  if (deck.status !== "READY") return jsonError("簡報尚未準備完成", 409);
  if (!getS3Config()) return jsonError("尚未設定物件儲存服務", 503);

  try {
    const bytes = await readPptxSource(deck.sourceFile);
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${safeFileName(deck.title)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return jsonError("PPTX 原始檔無法讀取", 502);
  }
}
