import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { maybeCreateDeckRevision } from "@/lib/revisions";
import { slideContentSchema } from "@/lib/schemas";
import { joinSlidesToMarkdown, markdownToContent, parseMarkdownDeck } from "@/lib/slides";

const MAX_SLIDES = 500;

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id, revisionId } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;

  const revision = await db.deckRevision.findFirst({ where: { id: revisionId, deckId: id } });
  if (!revision) return jsonError("找不到版本", 404);

  const sections = parseMarkdownDeck(revision.markdown);
  if (sections.length > MAX_SLIDES) return jsonError(`投影片數量上限為 ${MAX_SLIDES} 頁`, 400);
  const contents = sections.map((section) => markdownToContent(section.markdown));
  for (const content of contents) {
    if (!slideContentSchema.safeParse(content).success) return jsonError("版本內容不符合格式", 400);
  }

  const currentSlides = await db.slide.findMany({ where: { deckId: id }, orderBy: { order: "asc" }, select: { content: true, notes: true } });
  await maybeCreateDeckRevision({ deckId: id, authorId: user.id, title: access.deck.title, markdown: joinSlidesToMarkdown(currentSlides), force: true });

  await db.$transaction([
    db.slide.deleteMany({ where: { deckId: id } }),
    ...sections.map((section, i) => db.slide.create({ data: { deckId: id, order: i + 1, content: contents[i], notes: section.notes } })),
    db.deck.update({ where: { id }, data: { updatedAt: new Date(), sourceType: "MARKDOWN", status: "READY", sourceFile: null } }),
  ]);

  return NextResponse.json({ ok: true, markdown: revision.markdown, slideCount: sections.length });
}
