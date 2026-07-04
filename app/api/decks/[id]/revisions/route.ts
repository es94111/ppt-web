import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;

  const revisions = await db.deckRevision.findMany({
    where: { deckId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, slideCount: true, createdAt: true, markdown: true },
  });
  return NextResponse.json(revisions.map((revision) => ({
    ...revision,
    markdown: undefined,
    preview: revision.markdown.replace(/\s+/g, " ").slice(0, 140),
  })));
}
