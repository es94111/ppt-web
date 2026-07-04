// 客戶端 Markdown 渲染：marked 轉 HTML，再以 DOMPurify 白名單消毒（防 XSS，見開發文件 §9.3）
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import katex from "katex";
import mermaid from "mermaid";

marked.setOptions({ gfm: true, breaks: true });
mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });

// 外部連結在新分頁開啟並加上 noopener/noreferrer，防 tab-nabbing（UX/安全）
let hookAdded = false;
function ensureLinkHook() {
  if (hookAdded) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  hookAdded = true;
}

function renderMath(markdown: string) {
  const blocks: string[] = [];
  let next = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => {
    blocks.push(katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false, strict: false }));
    return `\n\n@@KATEX_BLOCK_${blocks.length - 1}@@\n\n`;
  });
  const inlines: string[] = [];
  // 行內數學界定規則（近似 pandoc）：`\$` 可轉義；開頭 `$` 後不接空白、
  // 結尾 `$` 前不接空白且後面不接數字，避免「$100 再 $200」這類金額被當成公式。
  next = next.replace(/(^|[^\\$])\$(?!\s)([^\n$]+?)(?<!\s)\$(?!\d)/g, (match: string, prefix: string, expr: string) => {
    inlines.push(katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false, strict: false }));
    return `${prefix}@@KATEX_INLINE_${inlines.length - 1}@@`;
  });
  next = next.replace(/@@KATEX_BLOCK_(\d+)@@/g, (_, index: string) => blocks[Number(index)] ?? "");
  next = next.replace(/@@KATEX_INLINE_(\d+)@@/g, (_, index: string) => inlines[Number(index)] ?? "");
  return next;
}

/**
 * 將 Markdown 轉為「已消毒」的 HTML 字串。
 * 僅於瀏覽器執行（DOMPurify 需要 DOM）；伺服器端回傳空字串，待 client 端 hydrate 後再渲染。
 */
export function renderMarkdown(markdown: string): string {
  if (typeof window === "undefined") return "";
  ensureLinkHook();
  const rawHtml = marked.parse(renderMath(markdown ?? ""), { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "form", "object", "embed"],
    FORBID_ATTR: ["style", "onerror", "onload"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
  });
}

export async function enhanceMarkdown(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll("pre code").forEach((node) => {
    const code = node as HTMLElement;
    if (code.className.includes("language-mermaid")) return;
    hljs.highlightElement(code);
  });
  const mermaidBlocks = Array.from(root.querySelectorAll("pre code.language-mermaid"));
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const code = mermaidBlocks[i] as HTMLElement;
    const pre = code.closest("pre");
    if (!pre || pre.dataset.rendered === "mermaid") continue;
    const container = document.createElement("div");
    container.className = "mermaid";
    container.textContent = code.textContent ?? "";
    pre.replaceWith(container);
    pre.dataset.rendered = "mermaid";
  }
  await mermaid.run({ nodes: Array.from(root.querySelectorAll(".mermaid")) as HTMLElement[] }).catch(() => undefined);
}
