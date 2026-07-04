import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getOwnedDeck, jsonError, requireUser } from "@/lib/http";
import { createShareToken } from "@/lib/share-links";
import { getShareLinkAnalytics } from "@/lib/share-analytics";
import { shareLinkCreateSchema } from "@/lib/schemas";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;

  const links = await db.shareLink.findMany({
    where: { deckId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, label: true, allowDownload: true, expiresAt: true, revokedAt: true, createdAt: true, passwordHash: true },
  });
  const analytics = await getShareLinkAnalytics(id, links.map((link) => link.id), await db.slide.count({ where: { deckId: id } }));
  return NextResponse.json(links.map(({ passwordHash, ...link }) => ({ ...link, hasPassword: !!passwordHash, analytics: analytics.get(link.id) })));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getOwnedDeck(id, user);
  if (access.error) return access.error;

  const parsed = shareLinkCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("分享設定不正確", 400, parsed.error.flatten());
  const password = parsed.data.password?.trim();
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return jsonError("到期時間不正確", 400);
  if (expiresAt && expiresAt.getTime() <= Date.now()) return jsonError("到期時間必須晚於現在", 400);

  const link = await db.shareLink.create({
    data: {
      deckId: id,
      createdById: user.id,
      token: createShareToken(),
      label: parsed.data.label || null,
      allowDownload: parsed.data.allowDownload,
      expiresAt,
      passwordHash: password ? await bcrypt.hash(password, 12) : null,
    },
    select: { id: true, token: true, label: true, allowDownload: true, expiresAt: true, revokedAt: true, createdAt: true, passwordHash: true },
  });
  const { passwordHash, ...safe } = link;
  return NextResponse.json({ ...safe, hasPassword: !!passwordHash }, { status: 201 });
}
