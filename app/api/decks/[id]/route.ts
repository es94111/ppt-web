import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getEditableDeck, hasDeckCookie, jsonError, requireUser } from "@/lib/http";
import { deckUpdateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const deck = await db.deck.findUnique({ where: { id }, include: { owner: { select: { name: true, email: true } }, slides: { orderBy: { order: "asc" } } } });
  if (!deck) return jsonError("找不到簡報", 404);
  const owns = user.role === "ADMIN" || deck.ownerId === user.id;
  if (deck.visibility === "PRIVATE" && !owns) return jsonError("沒有權限", 403);
  if (deck.visibility === "PASSWORD" && !owns && !hasDeckCookie(request, id)) return jsonError("需要簡報密碼", 403);
  const { passwordHash: _, ...safe } = deck;
  return NextResponse.json({ ...safe, canEdit: owns && (["ADMIN", "USER"] as string[]).includes(user.role) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  const parsed = deckUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("輸入資料不正確", 400, parsed.error.flatten());
  const { password, ...data } = parsed.data;
  const passwordHash = password === undefined ? undefined : password === null ? null : await bcrypt.hash(password, 12);
  if (data.visibility === "PASSWORD" && !passwordHash && !access.deck.passwordHash) return jsonError("密碼保護簡報必須設定密碼", 400);
  const deck = await db.deck.update({ where: { id }, data: { ...data, passwordHash } });
  return NextResponse.json({ ...deck, passwordHash: undefined });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  await db.deck.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
