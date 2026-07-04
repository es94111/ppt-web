import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canComment, getDeckCollaboration, jsonError, requireUser } from "@/lib/http";
import { commentResolveSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, commentId } = await params;
  const access = await getDeckCollaboration(id, user);
  if (access.error) return access.error;
  if (!canComment(access.role)) return jsonError("沒有留言權限", 403);
  const parsed = commentResolveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("狀態不正確", 400, parsed.error.flatten());
  const comment = await db.slideComment.findFirst({ where: { id: commentId, deckId: id } });
  if (!comment) return jsonError("找不到留言", 404);
  return NextResponse.json(await db.slideComment.update({
    where: { id: commentId },
    data: { resolvedAt: parsed.data.resolved ? new Date() : null, resolvedById: parsed.data.resolved ? user.id : null },
  }));
}
