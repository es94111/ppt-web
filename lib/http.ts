import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createDeckAccessToken,extractClientIp,verifyDeckAccessToken } from "@/lib/security";

export { createDeckAccessToken,verifyDeckAccessToken } from "@/lib/security";

export function getClientIp(request: NextRequest) {
  return extractClientIp(request.headers,Number(process.env.TRUSTED_PROXY_COUNT ?? "1"));
}

export const jsonError = (message: string, status: number, details?: unknown) => NextResponse.json({ error: message, details }, { status });

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isActive) return null;
  return session.user;
}

export async function getEditableDeck(deckId: string, user: { id: string; role: string }) {
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck) return { error: jsonError("找不到簡報", 404) };
  if (user.role !== "ADMIN" && deck.ownerId !== user.id) return { error: jsonError("沒有權限", 403) };
  return { deck };
}

export function hasDeckCookie(request: NextRequest, deckId: string) {
  const token = request.cookies.get(`deck_access_${deckId}`)?.value;
  return verifyDeckAccessToken(deckId, token);
}
