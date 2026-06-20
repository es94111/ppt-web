import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  const last = await db.slide.aggregate({ where: { deckId: id }, _max: { order: true } });
  const slide = await db.slide.create({ data: { deckId: id, order: (last._max.order ?? 0) + 1, content: { kind: "markdown", markdown: "" } } });
  return NextResponse.json(slide, { status: 201 });
}
