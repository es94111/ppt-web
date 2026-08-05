import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";
import { isPptxFile, parsePptxToSlides, uploadPublicObject } from "@/lib/pptx";
import { slideContentSchema } from "@/lib/schemas";
import { markdownToContent } from "@/lib/slides";

export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_SLIDES = 500;

// 上傳 .pptx，伺服器端直接解析 OOXML 內容，抽取文字/表格/備註轉為可編輯的 Markdown 簡報
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (!(["ADMIN", "USER"] as string[]).includes(user.role)) return jsonError("沒有上傳權限", 403);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少 PowerPoint 檔案", 400);
  if (file.size > MAX_BYTES) return jsonError("檔案過大（上限 30MB）", 400);
  if (!/\.pptx$/i.test(file.name)) return jsonError("僅接受 .pptx 檔", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPptxFile(buffer)) return jsonError("檔案內容不是有效的 PowerPoint 檔", 400);

  const title = String(form?.get("title") || "").trim() || file.name.replace(/\.pptx$/i, "").slice(0, 150) || "匯入的簡報";
  const importId = randomUUID();

  let sections;
  try {
    sections = await parsePptxToSlides(buffer, {
      uploadImage: (bytes, contentType, ext) => uploadPublicObject(`decks/_imports/${importId}/${randomUUID()}.${ext}`, bytes, contentType),
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

  const deck = await db.deck.create({
    data: {
      title,
      ownerId: user.id,
      visibility: "PRIVATE",
      sourceType: "PPTX",
      status: "READY",
      sourceFile: file.name.slice(0, 255),
      slides: { create: sections.map((s, i) => ({ order: i + 1, content: contents[i], notes: s.notes })) },
    },
  });
  return NextResponse.json({ id: deck.id, slideCount: sections.length }, { status: 201 });
}
