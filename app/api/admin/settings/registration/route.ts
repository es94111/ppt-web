import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function PATCH(request: NextRequest) {
  const actor = await requireUser();
  if (!actor) return jsonError("請先登入", 401);
  if (actor.role !== "ADMIN") return jsonError("僅限管理員", 403);

  const parsed = z.object({ allowPublicRegistration: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("設定格式不正確", 400);

  const settings = await db.siteSetting.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  return NextResponse.json(settings);
}
