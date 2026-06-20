"use client";
import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { SlideContent } from "@/lib/schemas";

// 渲染單張投影片：Markdown（消毒後 HTML）或 圖片（PPTX 轉出）。
// animate=true 時套用進場動畫（播放器用；編輯預覽維持靜態）。
export function SlideView({ content, animate = false }: { content: unknown; animate?: boolean }) {
  const c = content as SlideContent | undefined;
  const markdown = c?.kind === "markdown" ? c.markdown : "";
  const [html, setHtml] = useState("");
  // 於 client 端渲染並消毒，避免伺服器端 hydration 不一致
  useEffect(() => { setHtml(renderMarkdown(markdown)); }, [markdown]);

  const base = `slide-surface${animate ? " slide-animate" : ""}`;
  if (c?.kind === "image") {
    return (
      <div className={`${base} slide-surface-image`}>
        <img src={c.src} alt={c.alt ?? ""} draggable={false} />
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="slide-md" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
