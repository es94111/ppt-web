import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (user.role !== "ADMIN") return jsonError("僅限管理員", 403);
  const q = request.nextUrl.searchParams;
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const where: Prisma.ViewLogWhereInput = {};
  if (q.get("deckId")) where.deckId = q.get("deckId")!;
  if (q.get("userId")) where.userId = q.get("userId")!;
  if (q.get("ip")) where.ipAddress = { contains: q.get("ip")!.slice(0, 64) };
  if (q.get("from") || q.get("to")) where.viewedAt = { ...(q.get("from") && { gte: new Date(q.get("from")!) }), ...(q.get("to") && { lte: new Date(q.get("to")!) }) };
  const [logs, total] = await db.$transaction([
    db.viewLog.findMany({ where, include: { user: { select: { name: true, email: true } }, deck: { select: { title: true } } }, orderBy: { viewedAt: "desc" }, skip: (page - 1) * 50, take: 50 }),
    db.viewLog.count({ where })
  ]);
  return NextResponse.json({ logs, total, page });
}
