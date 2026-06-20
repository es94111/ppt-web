// 純函式（無外部相依，server/client 皆可用）：Markdown 整份文件 <-> 投影片
import type { SlideContent } from "./schemas";

// 以獨立一行的 `---` 分頁（Marp / reveal.js 慣例）
const SLIDE_SEPARATOR = /^\s*---\s*$/m;

/** 將整份 Deck 的 Markdown 依 `---` 切成多張投影片的 Markdown 片段（至少一張）。 */
export function splitMarkdownSlides(markdown: string): string[] {
  const parts = (markdown ?? "").split(SLIDE_SEPARATOR).map((s) => s.trim());
  const slides = parts.length ? parts : [""];
  return slides;
}

/** 把任意已存的 Slide content 轉成可編輯的 Markdown 文字（容錯處理舊資料）。 */
export function contentToMarkdown(content: unknown): string {
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (c.kind === "markdown" && typeof c.markdown === "string") return c.markdown;
    if (c.kind === "image" && typeof c.src === "string") return `![${(c.alt as string) ?? ""}](${c.src})`;
  }
  return "";
}

/** 將多張 Slide content 合併回單一可編輯的 Markdown 文件。 */
export function joinSlidesToMarkdown(contents: unknown[]): string {
  return contents.map(contentToMarkdown).join("\n\n---\n\n");
}

/** 把一段 Markdown 片段包成 Slide content。 */
export function markdownToContent(markdown: string): SlideContent {
  return { kind: "markdown", markdown };
}
