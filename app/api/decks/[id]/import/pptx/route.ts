import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { isPptxFile, parsePptxToSlides, uploadPublicObject } from "@/lib/pptx";
import { maybeCreateDeckRevision } from "@/lib/revisions";
import { slideContentSchema } from "@/lib/schemas";
import { joinSlidesToMarkdown, markdownToContent } from "@/lib/slides";

export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_SLIDES = 500;

// 以新的 .pptx 覆蓋既有簡報：解析文字內容為 Markdown 並取代所有頁面（覆蓋前保留一份版本紀錄）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少 PowerPoint 檔案", 400);
  if (file.size > MAX_BYTES) return jsonError("檔案過大（上限 30MB）", 400);
  if (!/\.pptx$/i.test(file.name)) return jsonError("僅接受 .pptx 檔", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPptxFile(buffer)) return jsonError("檔案內容不是有效的 PowerPoint 檔", 400);

  let sections;
  try {
    sections = await parsePptxToSlides(buffer, {
      uploadImage: (bytes, contentType, ext) => uploadPublicObject(`decks/${id}/images/${randomUUID()}.${ext}`, bytes, contentType),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "轉檔失敗";
    return jsonError(`PPTX 解析失敗：${message}`, 422);
  }
  if (sections.length > MAX_SLIDES) return jsonError(`投影片數量上限為 ${MAX_SLIDES} 頁`, 400);

  const contents = sections.map((s) => markdownToContent(s.markdown));
  for (const content of contents) {
    if (!slideContentSchema.safeParse(content).success) return jsonError("單頁內容超過長度上限，請簡化該頁內容", 400);
  }

  const currentSlides = await db.slide.findMany({ where: { deckId: id }, orderBy: { order: "asc" }, select: { content: true, notes: true } });
  const currentMarkdown = joinSlidesToMarkdown(currentSlides);
  await maybeCreateDeckRevision({ deckId: id, authorId: user.id, title: access.deck.title, markdown: currentMarkdown, force: true });

  await db.$transaction([
    db.slide.deleteMany({ where: { deckId: id } }),
    ...sections.map((s, i) => db.slide.create({ data: { deckId: id, order: i + 1, content: contents[i], notes: s.notes } })),
    db.deck.update({ where: { id }, data: { updatedAt: new Date(), sourceType: "PPTX", status: "READY", sourceFile: file.name.slice(0, 255) } }),
  ]);

  return NextResponse.json({ id, slideCount: sections.length });
}
