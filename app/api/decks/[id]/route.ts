import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { replaceDeckTags } from "@/lib/deck-tags";
import { getDeckCollaboration, getOwnedDeck, hasDeckCookie, jsonError, requireUser } from "@/lib/http";
import { deckUpdateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(); // 可為 null（匿名）
  const deck = await db.deck.findUnique({ where: { id }, include: { owner: { select: { name: true } }, slides: { orderBy: { order: "asc" } }, collaborators: { where: { userId: user?.id ?? "__anonymous__" }, select: { role: true } }, tags: { include: { tag: true } } } });
  if (!deck) return jsonError("找不到簡報", 404);
  const owns = !!user && (user.role === "ADMIN" || deck.ownerId === user.id);
  const collaborates = !!user && deck.collaborators.length > 0;
  // PUBLIC / UNLISTED 允許匿名；若有設定密碼，仍須先取得簡報憑證。
  if (deck.visibility === "PRIVATE" && !owns && !collaborates) return jsonError(user ? "沒有權限" : "請先登入", user ? 403 : 401);
  if (deck.visibility === "AUTHENTICATED" && !user) return jsonError("請先登入", 401);
  if (deck.passwordHash && !owns && !hasDeckCookie(request, id)) return jsonError("需要簡報密碼", 403);
  const { passwordHash: _, ...safe } = deck;
  const canEdit = !!user && (owns || deck.collaborators[0]?.role === "EDITOR") && (["ADMIN", "USER"] as string[]).includes(user.role);
  return NextResponse.json({ ...safe, canEdit, tags: deck.tags.map((item) => item.tag.name) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getDeckCollaboration(id, user);
  if (access.error) return access.error;
  if (!access.owns && access.role !== "EDITOR") return jsonError("沒有權限", 403);
  const parsed = deckUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("輸入資料不正確", 400, parsed.error.flatten());
  const { password, tags, visibility: rawVisibility, category, ...rest } = parsed.data;
  const data: Prisma.DeckUpdateInput = { ...rest };
  // 可見性、密碼、分類屬於分享／管理設定，僅擁有者（或 Admin）可變更；EDITOR 協作者只能改內容欄位與標籤。
  if (access.owns) {
    const visibility = rawVisibility === "PASSWORD" ? "PUBLIC" : rawVisibility;
    const effectiveVisibility = visibility ?? (access.deck.visibility === "PASSWORD" ? "PUBLIC" : access.deck.visibility);
    data.visibility = visibility;
    data.passwordHash = effectiveVisibility !== "PUBLIC" ? null : password === undefined ? undefined : password === null ? null : await bcrypt.hash(password, 12);
    if (category !== undefined) data.category = category;
  }
  const deck = await db.deck.update({ where: { id }, data });
  if (tags) await replaceDeckTags(id, tags);
  return NextResponse.json({ ...deck, passwordHash: undefined });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;
  await db.deck.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
