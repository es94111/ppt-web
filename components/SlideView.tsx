"use client";
import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { SlideContent } from "@/lib/schemas";

// 渲染單張投影片：Markdown（消毒後 HTML）或 圖片（PPTX 轉出）。
export function SlideView({ content }: { content: unknown }) {
  const c = content as SlideContent | undefined;
  const markdown = c?.kind === "markdown" ? c.markdown : "";
  const [html, setHtml] = useState("");
  // 於 client 端渲染並消毒，避免伺服器端 hydration 不一致
  useEffect(() => { setHtml(renderMarkdown(markdown)); }, [markdown]);

  if (c?.kind === "image") {
    return (
      <div className="slide-surface slide-surface-image">
        <img src={c.src} alt={c.alt ?? ""} draggable={false} />
      </div>
    );
  }
  return (
    <div className="slide-surface">
      <div className="slide-md" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
