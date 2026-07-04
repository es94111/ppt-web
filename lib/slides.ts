// 純函式（無外部相依，server/client 皆可用）：Markdown 整份文件 <-> 投影片
import type { SlideContent } from "./schemas";

// 以獨立一行的 `---` 分頁（Marp / reveal.js 慣例）
const SLIDE_SEPARATOR = /^\s*---\s*$/m;
// 以獨立一行的 `???` 作為講者備註分隔（remark / reveal.js 常見慣例）
const NOTES_SEPARATOR = /^\s*\?\?\?\s*$/m;

export type ParsedMarkdownSlide = { markdown: string; notes: string | null };

function splitSlideNotes(markdown: string): ParsedMarkdownSlide {
  const parts = (markdown ?? "").split(NOTES_SEPARATOR);
  const visible = (parts.shift() ?? "").trim();
  const notes = parts.join("\n???\n").trim();
  return { markdown: visible, notes: notes || null };
}

/** 將整份 Deck 的 Markdown 依 `---` 切成多張投影片的 Markdown 片段（至少一張）。 */
export function splitMarkdownSlides(markdown: string): string[] {
  return parseMarkdownDeck(markdown).map((slide) => slide.markdown);
}

/** 將整份 Deck 的 Markdown 解析為投影片內容與講者備註。 */
export function parseMarkdownDeck(markdown: string): ParsedMarkdownSlide[] {
  const parts = (markdown ?? "").split(SLIDE_SEPARATOR).map(splitSlideNotes);
  return parts.length ? parts : [{ markdown: "", notes: null }];
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

function normalizeSlideInput(input: unknown): { content: unknown; notes?: string | null } {
  if (input && typeof input === "object" && "content" in input) return input as { content: unknown; notes?: string | null };
  return { content: input };
}

/** 將多張 Slide content 合併回單一可編輯的 Markdown 文件，並保留 `???` 講者備註。 */
export function joinSlidesToMarkdown(slides: unknown[]): string {
  return slides.map((input) => {
    const slide = normalizeSlideInput(input);
    const markdown = contentToMarkdown(slide.content);
    const notes = (slide.notes ?? "").trim();
    return notes ? `${markdown}\n\n???\n${notes}` : markdown;
  }).join("\n\n---\n\n");
}

/** 把一段 Markdown 片段包成 Slide content。 */
export function markdownToContent(markdown: string): SlideContent {
  return { kind: "markdown", markdown };
}
