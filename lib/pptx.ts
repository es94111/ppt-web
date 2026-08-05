// PPTX → Markdown 轉換：直接解析 OOXML（.pptx 內部的 ZIP + XML），不依賴 LibreOffice 或任何
// PPTX 解析用的開源套件。抽取每頁的標題／內文／條列／表格／講者備註為可編輯的 Markdown 文字。
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readZip, type ZipEntries } from "./zip";
import { children, findAll, findFirst, parseXml, textContent, type XmlNode } from "./xml";
import type { ParsedMarkdownSlide } from "./slides";

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04（.pptx 本質是 ZIP）
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SKIP_PLACEHOLDER_TYPES = new Set(["sldNum", "dt", "ftr", "sldImg"]);
const IMAGE_CONTENT_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" };

export type UploadImageFn = (bytes: Buffer, contentType: string, ext: string) => Promise<string | null>;
export type ParsePptxOptions = { uploadImage?: UploadImageFn };

/** 檔案前 4 bytes 是否為 ZIP 簽章（.pptx 必然如此）。 */
export function isPptxFile(buf: Buffer): boolean {
  return ZIP_MAGIC.every((b, i) => buf[i] === b);
}

type Rel = { type: string; target: string; external: boolean };

function resolveRelTarget(basePath: string, target: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return target; // 已是絕對 URL（含 http(s):、mailto: 等）
  const stack: string[] = [];
  for (const part of `${basePath}/${target}`.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function parseRels(xml: string | undefined, basePath: string): Map<string, Rel> {
  const map = new Map<string, Rel>();
  if (!xml) return map;
  const root = parseXml(xml);
  for (const rel of findAll(root, "Relationship")) {
    const id = rel.attrs.Id;
    if (!id) continue;
    const external = rel.attrs.TargetMode === "External";
    const rawTarget = rel.attrs.Target || "";
    map.set(id, { type: rel.attrs.Type || "", target: external ? rawTarget : resolveRelTarget(basePath, rawTarget), external });
  }
  return map;
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function baseNameOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/** 逃脫會被誤判為 Markdown 語法的字元，避免簡報原文被意外套上格式。 */
function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]]/g, (c) => `\\${c}`);
}

function renderRun(node: XmlNode, rels: Map<string, Rel>): string {
  if (node.tag === "a:br") return "  \n";
  const tNode = findFirst(node, "a:t");
  const raw = tNode ? textContent(tNode) : "";
  if (!raw) return "";
  let text = escapeMarkdown(raw);
  const rPr = findFirst(node, "a:rPr");
  const italic = rPr?.attrs.i === "1";
  const bold = rPr?.attrs.b === "1";
  if (italic) text = `*${text}*`;
  if (bold) text = `**${text}**`;
  const rid = rPr ? findFirst(rPr, "a:hlinkClick")?.attrs["r:id"] : undefined;
  const rel = rid ? rels.get(rid) : undefined;
  if (rel?.target) text = `[${text}](${rel.target})`;
  return text;
}

function renderParagraph(p: XmlNode, rels: Map<string, Rel>, defaultBulleted: boolean): { text: string; bulleted: boolean } {
  const pPr = findFirst(p, "a:pPr");
  const lvl = pPr?.attrs.lvl ? Math.max(0, Math.min(5, parseInt(pPr.attrs.lvl, 10) || 0)) : 0;
  const explicitNoBullet = !!pPr && !!findFirst(pPr, "a:buNone");
  const bulleted = defaultBulleted && !explicitNoBullet;

  const runText = p.children
    .filter((c) => c.tag === "a:r" || c.tag === "a:br" || c.tag === "a:fld")
    .map((c) => renderRun(c, rels))
    .join("");
  const trimmed = runText.trim();
  if (!trimmed) return { text: "", bulleted: false };
  return { text: bulleted ? `${"  ".repeat(lvl)}- ${trimmed}` : trimmed, bulleted };
}

/** 依「條列/非條列」的交界插入空行，讓連續條列合併成同一份清單。 */
function joinParagraphs(paragraphs: { text: string; bulleted: boolean }[]): string {
  const nonEmpty = paragraphs.filter((p) => p.text);
  let out = "";
  for (let i = 0; i < nonEmpty.length; i++) {
    if (i > 0) out += nonEmpty[i].bulleted && nonEmpty[i - 1].bulleted ? "\n" : "\n\n";
    out += nonEmpty[i].text;
  }
  return out;
}

function shapeParagraphs(txBody: XmlNode, rels: Map<string, Rel>, bulleted: boolean): { text: string; bulleted: boolean }[] {
  return children(txBody, "a:p").map((p) => renderParagraph(p, rels, bulleted));
}

function renderShapeText(sp: XmlNode, rels: Map<string, Rel>): { text: string; isTitle: boolean; isSubtitle: boolean } {
  const ph = findFirst(sp, "p:ph");
  const phType = ph?.attrs.type;
  if (phType && SKIP_PLACEHOLDER_TYPES.has(phType)) return { text: "", isTitle: false, isSubtitle: false };
  const isTitle = phType === "title" || phType === "ctrTitle";
  const isSubtitle = phType === "subTitle";
  const txBody = findFirst(sp, "p:txBody");
  if (!txBody) return { text: "", isTitle, isSubtitle };
  const bulleted = !isTitle && !isSubtitle;
  return { text: joinParagraphs(shapeParagraphs(txBody, rels, bulleted)), isTitle, isSubtitle };
}

function renderTable(tbl: XmlNode, rels: Map<string, Rel>): string {
  const rows = children(tbl, "a:tr").map((tr) =>
    children(tr, "a:tc").map((tc) => {
      const txBody = findFirst(tc, "a:txBody");
      const lines = txBody ? shapeParagraphs(txBody, rels, false).map((p) => p.text).filter(Boolean) : [];
      return lines.join("<br>") || " ";
    })
  );
  if (!rows.length) return "";
  const colCount = Math.max(...rows.map((r) => r.length));
  const escCell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const padded = rows.map((r) => [...r, ...Array(Math.max(0, colCount - r.length)).fill(" ")]);
  const lines = [
    `| ${padded[0].map(escCell).join(" | ")} |`,
    `| ${Array(colCount).fill("---").join(" | ")} |`,
    ...padded.slice(1).map((r) => `| ${r.map(escCell).join(" | ")} |`),
  ];
  return lines.join("\n");
}

async function renderPicture(pic: XmlNode, rels: Map<string, Rel>, zip: ZipEntries, uploadImage: UploadImageFn): Promise<string> {
  const rid = findFirst(pic, "a:blip")?.attrs["r:embed"];
  const rel = rid ? rels.get(rid) : undefined;
  if (!rel || rel.external) return "";
  const bytes = zip.get(rel.target);
  if (!bytes || !bytes.length || bytes.length > MAX_IMAGE_BYTES) return "";
  const ext = (rel.target.split(".").pop() || "").toLowerCase();
  const contentType = IMAGE_CONTENT_TYPES[ext];
  if (!contentType) return "";
  const url = await uploadImage(bytes, contentType, ext).catch(() => null);
  if (!url) return "";
  const name = findFirst(pic, "p:cNvPr")?.attrs;
  const alt = escapeMarkdown((name?.descr || name?.name || "圖片").trim());
  return `![${alt}](${url})`;
}

/** 收集 spTree 底下所有形狀，並攤平 p:grpSp（群組）內的巢狀形狀。 */
function collectShapes(node: XmlNode): XmlNode[] {
  const out: XmlNode[] = [];
  for (const child of node.children) {
    if (child.tag === "p:grpSp") out.push(...collectShapes(child));
    else if (child.tag === "p:sp" || child.tag === "p:pic" || child.tag === "p:graphicFrame") out.push(child);
  }
  return out;
}

async function renderSlide(xml: string, rels: Map<string, Rel>, zip: ZipEntries, uploadImage?: UploadImageFn): Promise<string> {
  const root = parseXml(xml);
  const spTree = findFirst(root, "p:spTree");
  if (!spTree) return "";

  let titleText = "";
  const blocks: string[] = [];
  for (const shape of collectShapes(spTree)) {
    if (shape.tag === "p:sp") {
      const { text, isTitle, isSubtitle } = renderShapeText(shape, rels);
      if (!text) continue;
      if (isTitle && !titleText) titleText = text.replace(/\s*\n+\s*/g, " ").trim();
      else if (isSubtitle) blocks.push(text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `*${l}*`).join("\n\n"));
      else blocks.push(text);
    } else if (shape.tag === "p:graphicFrame") {
      const tbl = findFirst(shape, "a:tbl");
      if (tbl) {
        const table = renderTable(tbl, rels);
        if (table) blocks.push(table);
      }
    } else if (shape.tag === "p:pic" && uploadImage) {
      const image = await renderPicture(shape, rels, zip, uploadImage);
      if (image) blocks.push(image);
    }
  }

  const parts = titleText ? [`# ${titleText}`, ...blocks] : blocks;
  return parts.join("\n\n").trim();
}

function extractNotesText(xml: string): string | null {
  const root = parseXml(xml);
  const spTree = findFirst(root, "p:spTree");
  if (!spTree) return null;
  const texts: string[] = [];
  for (const shape of children(spTree, "p:sp")) {
    const phType = findFirst(shape, "p:ph")?.attrs.type;
    if (phType && (SKIP_PLACEHOLDER_TYPES.has(phType) || phType === "title" || phType === "ctrTitle")) continue;
    const txBody = findFirst(shape, "p:txBody");
    if (!txBody) continue;
    const text = joinParagraphs(shapeParagraphs(txBody, new Map(), false));
    if (text) texts.push(text);
  }
  const joined = texts.join("\n\n").trim();
  return joined || null;
}

/** 將 .pptx 的原始 bytes 解析為每頁的 Markdown 內容與講者備註（保留投影片原本順序）。 */
export async function parsePptxToSlides(buf: Buffer, options: ParsePptxOptions = {}): Promise<ParsedMarkdownSlide[]> {
  if (!isPptxFile(buf)) throw new Error("檔案內容不是有效的 PowerPoint（.pptx）格式");
  const zip = readZip(buf);

  const presentationBuf = zip.get("ppt/presentation.xml");
  if (!presentationBuf) throw new Error("找不到簡報內容（ppt/presentation.xml），檔案可能已損毀");
  const presRoot = parseXml(presentationBuf.toString("utf8"));
  const presRels = parseRels(zip.get("ppt/_rels/presentation.xml.rels")?.toString("utf8"), "ppt");

  const sldIdLst = findFirst(presRoot, "p:sldIdLst");
  const slidePaths = (sldIdLst ? children(sldIdLst, "p:sldId") : [])
    .map((sldId) => presRels.get(sldId.attrs["r:id"])?.target)
    .filter((p): p is string => !!p);
  if (!slidePaths.length) throw new Error("這份簡報內沒有任何投影片");

  const slides: ParsedMarkdownSlide[] = [];
  for (const slidePath of slidePaths) {
    const slideBuf = zip.get(slidePath);
    if (!slideBuf) continue;
    const slideDir = dirOf(slidePath);
    const relsPath = `${slideDir}/_rels/${baseNameOf(slidePath)}.rels`;
    const slideRels = parseRels(zip.get(relsPath)?.toString("utf8"), slideDir);

    let notes: string | null = null;
    const notesRel = [...slideRels.values()].find((r) => r.type.endsWith("/notesSlide"));
    if (notesRel) {
      const notesBuf = zip.get(notesRel.target);
      if (notesBuf) notes = extractNotesText(notesBuf.toString("utf8"));
    }

    const markdown = await renderSlide(slideBuf.toString("utf8"), slideRels, zip, options.uploadImage);
    slides.push({ markdown, notes });
  }
  return slides;
}

function getS3Config() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_PUBLIC_URL) return null;
  return { S3_ENDPOINT, S3_REGION: S3_REGION || "auto", S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL };
}

/** 若已設定物件儲存服務則上傳並回傳公開網址；未設定時回傳 null，呼叫端應優雅略過該圖片。 */
export async function uploadPublicObject(key: string, body: Buffer, contentType: string): Promise<string | null> {
  const cfg = getS3Config();
  if (!cfg) return null;
  const client = new S3Client({ region: cfg.S3_REGION, endpoint: cfg.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: cfg.S3_ACCESS_KEY, secretAccessKey: cfg.S3_SECRET_KEY } }); // gitleaks:allow (值來自 env var 參照，非硬編碼密鑰)
  await client.send(new PutObjectCommand({ Bucket: cfg.S3_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return `${cfg.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}
