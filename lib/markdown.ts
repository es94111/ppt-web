// 客戶端 Markdown 渲染：marked 轉 HTML，再以 DOMPurify 白名單消毒（防 XSS，見開發文件 §9.3）
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: true });

/**
 * 將 Markdown 轉為「已消毒」的 HTML 字串。
 * 僅於瀏覽器執行（DOMPurify 需要 DOM）；伺服器端回傳空字串，待 client 端 hydrate 後再渲染。
 */
export function renderMarkdown(markdown: string): string {
  if (typeof window === "undefined") return "";
  const rawHtml = marked.parse(markdown ?? "", { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "form", "object", "embed"],
    FORBID_ATTR: ["style", "onerror", "onload"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
  });
}
