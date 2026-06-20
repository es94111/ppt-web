import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (user.role !== "ADMIN") return jsonError("僅限管理員", 403);
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const search = request.nextUrl.searchParams.get("search")?.slice(0, 100);
  const where = search ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] } : {};
  const [users, total] = await db.$transaction([
    db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30 }),
    db.user.count({ where })
  ]);
  return NextResponse.json({ users, total, page });
}
