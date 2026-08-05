import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { maybeCreateDeckRevision } from "@/lib/revisions";
import { deckMarkdownSchema, slideContentSchema } from "@/lib/schemas";
import { joinSlidesToMarkdown, parseMarkdownDeck, markdownToContent } from "@/lib/slides";

const MAX_SLIDES = 500;

// 儲存整份 Deck 的 Markdown：依 `---` 切頁後，重建所有 Slide 列
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;

  const parsed = deckMarkdownSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("內容格式不正確", 400, parsed.error.flatten());

  const sections = parseMarkdownDeck(parsed.data.markdown);
  if (sections.length > MAX_SLIDES) return jsonError(`投影片數量上限為 ${MAX_SLIDES} 頁`, 400);

  const contents = sections.map((section) => markdownToContent(section.markdown));
  for (const content of contents) {
    if (!slideContentSchema.safeParse(content).success) return jsonError("單頁內容超過長度上限", 400);
  }

  const currentSlides = await db.slide.findMany({ where: { deckId: id }, orderBy: { order: "asc" }, select: { content: true, notes: true } });
  const currentMarkdown = joinSlidesToMarkdown(currentSlides);
  if (currentMarkdown === parsed.data.markdown.trim()) return NextResponse.json({ ok: true, slideCount: contents.length });
  await maybeCreateDeckRevision({ deckId: id, authorId: user.id, title: access.deck.title, markdown: currentMarkdown });

  await db.$transaction([
    db.slide.deleteMany({ where: { deckId: id } }),
    ...sections.map((section, i) => db.slide.create({ data: { deckId: id, order: i + 1, content: contents[i], notes: section.notes } })),
    db.deck.update({ where: { id }, data: { updatedAt: new Date(), sourceType: "MARKDOWN", status: "READY", sourceFile: null } }),
  ]);

  return NextResponse.json({ ok: true, slideCount: contents.length });
}
