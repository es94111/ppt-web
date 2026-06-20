import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/http";
import { convertPptxToImageSlides, getS3Config } from "@/lib/pptx";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04（.pptx 為 zip）

// 上傳 .pptx → 建立 PPTX 簡報並轉成每頁圖片（唯讀）
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("請先登入", 401);
  if (!(["ADMIN", "USER"] as string[]).includes(user.role)) return jsonError("沒有上傳權限", 403);
  if (!getS3Config()) return jsonError("尚未設定物件儲存服務（S3），無法處理 PPTX", 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少 PowerPoint 檔案", 400);
  if (file.size > MAX_BYTES) return jsonError("檔案過大（上限 50MB）", 400);
  if (!/\.pptx$/i.test(file.name)) return jsonError("僅接受 .pptx 檔", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!ZIP_MAGIC.every((b, i) => buffer[i] === b)) return jsonError("檔案內容不是有效的 PowerPoint 檔", 400);

  const title = String(form?.get("title") || "").trim() || file.name.replace(/\.pptx$/i, "").slice(0, 150) || "匯入的簡報";

  // 先建立 PROCESSING 狀態的 Deck，取得 deckId 供物件儲存路徑使用
  const deck = await db.deck.create({
    data: { title, ownerId: user.id, visibility: "PRIVATE", sourceType: "PPTX", status: "PROCESSING" },
  });

  try {
    const slides = await convertPptxToImageSlides(deck.id, buffer);
    if (!slides.length) throw new Error("轉檔未產生任何頁面");
    await db.$transaction([
      db.slide.deleteMany({ where: { deckId: deck.id } }),
      ...slides.map((s, i) => db.slide.create({ data: { deckId: deck.id, order: i + 1, content: { kind: "image", src: s.src, alt: s.alt } } })),
      db.deck.update({ where: { id: deck.id }, data: { status: "READY" } }),
    ]);
    return NextResponse.json({ id: deck.id, status: "READY", slideCount: slides.length }, { status: 201 });
  } catch (e) {
    await db.deck.update({ where: { id: deck.id }, data: { status: "FAILED" } }).catch(() => {});
    const message = e instanceof Error ? e.message : "轉檔失敗";
    return jsonError(`PPTX 轉檔失敗：${message}`, 422, { deckId: deck.id });
  }
}
