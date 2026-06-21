import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getClientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas";
import { canCreatePublicAccount } from "@/lib/site-settings";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`register:${getClientIp(request)}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "請稍後再試" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("輸入資料不正確", 400, parsed.error.flatten());
  if (!await canCreatePublicAccount()) return jsonError("管理員目前未開放公開註冊", 403);
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return jsonError("此 Email 已註冊", 409);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.$transaction(async tx => {
    const role = (await tx.user.count()) === 0 ? "ADMIN" : "GUEST";
    return tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role }, select: { id: true, email: true, role: true } });
  },{isolationLevel:"Serializable"});
  return NextResponse.json(user, { status: 201 });
}
