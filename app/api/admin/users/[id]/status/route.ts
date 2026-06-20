import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (!actor) return jsonError("請先登入", 401);
  if (actor.role !== "ADMIN") return jsonError("僅限管理員", 403);
  const { id } = await params;
  if (id === actor.id) return jsonError("不可停用自己的帳號", 409);
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("狀態不正確", 400);
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return jsonError("找不到使用者", 404);
  if (!parsed.data.isActive && target.role === "ADMIN" && await db.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) return jsonError("不可停用最後一位有效管理員", 409);
  return NextResponse.json(await db.user.update({ where: { id }, data: { isActive: parsed.data.isActive }, select: { id: true, isActive: true } }));
}
