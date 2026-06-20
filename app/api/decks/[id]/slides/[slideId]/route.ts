import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { slideContentSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; slideId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, slideId } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  const parsed = z.object({ content: slideContentSchema, notes: z.string().max(10000).nullable().optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("投影片格式不正確", 400, parsed.error.flatten());
  const existing = await db.slide.findFirst({ where: { id: slideId, deckId: id } });
  if (!existing) return jsonError("找不到投影片", 404);
  const slide = await db.slide.update({ where: { id: slideId }, data: parsed.data });
  return NextResponse.json(slide);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; slideId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, slideId } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  const slides = await db.slide.findMany({ where: { deckId: id }, orderBy: { order: "asc" } });
  if (slides.length <= 1) return jsonError("簡報至少需要一張投影片", 400);
  if (!slides.some(s => s.id === slideId)) return jsonError("找不到投影片", 404);
  await db.$transaction([
    db.slide.delete({ where: { id: slideId } }),
    ...slides.filter(s => s.id !== slideId).map((s, index) => db.slide.update({ where: { id: s.id }, data: { order: index + 1 } }))
  ]);
  return new NextResponse(null, { status: 204 });
}
