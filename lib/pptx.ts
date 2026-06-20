// PPTX 轉檔：LibreOffice headless 轉 PDF → pdftoppm 轉每頁 PNG → 上傳物件儲存
// 需執行環境具備 `soffice`（LibreOffice）與 `pdftoppm`（poppler-utils）。見開發文件 §4.3 / §9.6。
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const exec = promisify(execFile);
const SOFFICE = process.env.SOFFICE_PATH || "soffice";
const PDFTOPPM = process.env.PDFTOPPM_PATH || "pdftoppm";
const TIMEOUT = 120_000;
const MAX_BUFFER = 64 * 1024 * 1024;

export function getS3Config() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_PUBLIC_URL) return null;
  return { S3_ENDPOINT, S3_REGION: S3_REGION || "auto", S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL };
}

function pageNumber(name: string) {
  return Number(name.match(/(\d+)\.png$/)?.[1] ?? 0);
}

/** 將 .pptx 轉成每頁 PNG，上傳物件儲存，回傳 image 投影片內容陣列。 */
export async function convertPptxToImageSlides(deckId: string, pptx: Buffer): Promise<{ src: string; alt: string }[]> {
  const cfg = getS3Config();
  if (!cfg) throw new Error("尚未設定物件儲存服務（S3），無法處理 PPTX 轉檔");

  const work = await mkdtemp(join(tmpdir(), "pptx-"));
  try {
    const pptxPath = join(work, "input.pptx");
    await writeFile(pptxPath, pptx);

    // 1. pptx → pdf（隔離：限制時間/緩衝；建議於無網路、非 root 環境執行，見 §9.6）
    await exec(SOFFICE, ["--headless", "--norestore", "--convert-to", "pdf", "--outdir", work, pptxPath], { timeout: TIMEOUT, maxBuffer: MAX_BUFFER });
    const pdfPath = join(work, "input.pdf");

    // 2. pdf → 每頁 png
    await exec(PDFTOPPM, ["-png", "-r", "150", pdfPath, join(work, "page")], { timeout: TIMEOUT, maxBuffer: MAX_BUFFER });

    const files = (await readdir(work)).filter((f) => /^page-?\d+\.png$/.test(f)).sort((a, b) => pageNumber(a) - pageNumber(b));
    if (!files.length) throw new Error("轉檔未產生任何頁面");

    const client = new S3Client({ region: cfg.S3_REGION, endpoint: cfg.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: cfg.S3_ACCESS_KEY, secretAccessKey: cfg.S3_SECRET_KEY } });
    const base = cfg.S3_PUBLIC_URL.replace(/\/$/, "");
    const slides: { src: string; alt: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const body = await readFile(join(work, files[i]));
      const key = `decks/${deckId}/pages/${i + 1}.png`;
      await client.send(new PutObjectCommand({ Bucket: cfg.S3_BUCKET, Key: key, Body: body, ContentType: "image/png" }));
      slides.push({ src: `${base}/${key}`, alt: `第 ${i + 1} 頁` });
    }
    return slides;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
