import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";
import { markdownImportSchema, slideContentSchema } from "@/lib/schemas";
import { splitMarkdownSlides, markdownToContent } from "@/lib/slides";

const MAX_BYTES = 1 * 1024 * 1024; // 1MB
const MAX_SLIDES = 500;

// 上傳 .md / .markdown，依 --- 切頁建立一份可編輯（MARKDOWN）簡報
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (!(["ADMIN", "USER"] as string[]).includes(user.role)) return jsonError("沒有上傳權限", 403);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少 Markdown 檔案", 400);
  if (file.size > MAX_BYTES) return jsonError("檔案過大（上限 1MB）", 400);
  if (!/\.(md|markdown)$/i.test(file.name)) return jsonError("僅接受 .md / .markdown 檔", 400);

  const markdown = await file.text();
  const title = String(form?.get("title") || "").trim() || file.name.replace(/\.(md|markdown)$/i, "").slice(0, 150) || "匯入的簡報";

  const parsed = markdownImportSchema.safeParse({ title, markdown });
  if (!parsed.success) return jsonError("Markdown 內容不正確", 400, parsed.error.flatten());

  const sections = splitMarkdownSlides(parsed.data.markdown);
  if (sections.length > MAX_SLIDES) return jsonError(`投影片數量上限為 ${MAX_SLIDES} 頁`, 400);
  const contents = sections.map(markdownToContent);
  for (const content of contents) {
    if (!slideContentSchema.safeParse(content).success) return jsonError("單頁內容超過長度上限", 400);
  }

  const deck = await db.deck.create({
    data: {
      title: parsed.data.title,
      ownerId: user.id,
      visibility: "PRIVATE",
      sourceType: "MARKDOWN",
      status: "READY",
      slides: { create: contents.map((content, i) => ({ order: i + 1, content })) },
    },
  });
  return NextResponse.json({ id: deck.id }, { status: 201 });
}
