import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canComment, getDeckCollaboration, jsonError, requireUser } from "@/lib/http";
import { commentCreateSchema } from "@/lib/schemas";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getDeckCollaboration(id, user);
  if (access.error) return access.error;
  if (!access.role) return jsonError("沒有權限", 403);
  const comments = await db.slideComment.findMany({
    where: { deckId: id },
    include: { author: { select: { name: true, email: true } }, slide: { select: { order: true } } },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(comments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getDeckCollaboration(id, user);
  if (access.error) return access.error;
  if (!canComment(access.role)) return jsonError("沒有留言權限", 403);
  const parsed = commentCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("留言內容不正確", 400, parsed.error.flatten());
  const slide = await db.slide.findFirst({ where: { id: parsed.data.slideId, deckId: id }, select: { id: true } });
  if (!slide) return jsonError("找不到投影片", 404);
  const comment = await db.slideComment.create({
    data: { deckId: id, slideId: slide.id, authorId: user.id, body: parsed.data.body },
    include: { author: { select: { name: true, email: true } }, slide: { select: { order: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
