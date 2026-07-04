import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOwnedDeck, jsonError, requireUser } from "@/lib/http";
import { collaboratorSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; collaboratorId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, collaboratorId } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const parsed = collaboratorSchema.pick({ role: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("角色不正確", 400, parsed.error.flatten());
  const collaborator = await db.deckCollaborator.findFirst({ where: { id: collaboratorId, deckId: id } });
  if (!collaborator) return jsonError("找不到協作者", 404);
  return NextResponse.json(await db.deckCollaborator.update({ where: { id: collaboratorId }, data: { role: parsed.data.role } }));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; collaboratorId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, collaboratorId } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  const collaborator = await db.deckCollaborator.findFirst({ where: { id: collaboratorId, deckId: id } });
  if (!collaborator) return jsonError("找不到協作者", 404);
  await db.deckCollaborator.delete({ where: { id: collaboratorId } });
  return new NextResponse(null, { status: 204 });
}
