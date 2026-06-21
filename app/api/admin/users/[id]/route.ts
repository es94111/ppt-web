import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (!actor) return jsonError("請先登入", 401);
  if (actor.role !== "ADMIN") return jsonError("僅限管理員", 403);

  const { id } = await params;
  if (id === actor.id) return jsonError("不可刪除自己的帳號", 409);

  try {
    await db.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
      if (!target) throw new UserDeleteError("找不到使用者", 404);

      if (target.role === "ADMIN" && target.isActive) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) throw new UserDeleteError("不可刪除最後一位有效管理員", 409);
      }

      await tx.user.delete({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof UserDeleteError) return jsonError(error.message, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return jsonError("找不到使用者", 404);
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}

class UserDeleteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
