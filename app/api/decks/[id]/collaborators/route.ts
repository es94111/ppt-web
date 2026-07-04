import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOwnedDeck, jsonError, requireUser } from "@/lib/http";
import { collaboratorSchema } from "@/lib/schemas";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const collaborators = await db.deckCollaborator.findMany({
    where: { deckId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(collaborators);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const parsed = collaboratorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("協作者資料不正確", 400, parsed.error.flatten());
  const target = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, name: true } });
  if (!target) return jsonError("找不到此 Email 使用者", 404);
  if (target.id === access.deck.ownerId) return jsonError("擁有者不需要加入協作者", 400);
  const collaborator = await db.deckCollaborator.upsert({
    where: { deckId_userId: { deckId: id, userId: target.id } },
    update: { role: parsed.data.role },
    create: { deckId: id, userId: target.id, role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(collaborator, { status: 201 });
}
