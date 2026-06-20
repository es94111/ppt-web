import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (!actor) return jsonError("請先登入", 401);
  if (actor.role !== "ADMIN") return jsonError("僅限管理員", 403);
  const { id } = await params;
  const parsed = z.object({ role: z.enum(["ADMIN", "USER", "GUEST"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("角色不正確", 400);
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return jsonError("找不到使用者", 404);
  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN" && await db.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) return jsonError("不可降級最後一位有效管理員", 409);
  const updated = await db.user.update({ where: { id }, data: { role: parsed.data.role }, select: { id: true, role: true } });
  return NextResponse.json(updated);
}
