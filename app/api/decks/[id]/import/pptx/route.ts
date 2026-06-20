import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEditableDeck, jsonError, requireUser } from "@/lib/http";
import { convertPptxToImageSlides, getS3Config } from "@/lib/pptx";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

// 以新的 .pptx 覆蓋更新「既有」的 PPTX 簡報（重新轉檔並取代所有頁面）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  const { id } = await params;
  const access = await getEditableDeck(id, user);
  if (access.error) return access.error;
  if (access.deck.sourceType !== "PPTX") return jsonError("此簡報不是 PowerPoint 類型，請改用 Markdown 更新", 400);
  if (!getS3Config()) return jsonError("尚未設定物件儲存服務（S3），無法處理 PPTX", 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少 PowerPoint 檔案", 400);
  if (file.size > MAX_BYTES) return jsonError("檔案過大（上限 50MB）", 400);
  if (!/\.pptx$/i.test(file.name)) return jsonError("僅接受 .pptx 檔", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!ZIP_MAGIC.every((b, i) => buffer[i] === b)) return jsonError("檔案內容不是有效的 PowerPoint 檔", 400);

  await db.deck.update({ where: { id }, data: { status: "PROCESSING" } });
  try {
    const slides = await convertPptxToImageSlides(id, buffer);
    if (!slides.length) throw new Error("轉檔未產生任何頁面");
    await db.$transaction([
      db.slide.deleteMany({ where: { deckId: id } }),
      ...slides.map((s, i) => db.slide.create({ data: { deckId: id, order: i + 1, content: { kind: "image", src: s.src, alt: s.alt } } })),
      db.deck.update({ where: { id }, data: { status: "READY" } }),
    ]);
    return NextResponse.json({ id, status: "READY", slideCount: slides.length });
  } catch (e) {
    await db.deck.update({ where: { id }, data: { status: "FAILED" } }).catch(() => {});
    const message = e instanceof Error ? e.message : "轉檔失敗";
    return jsonError(`PPTX 轉檔失敗：${message}`, 422);
  }
}
