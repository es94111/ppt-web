"use client";
import { useEffect, useRef, useState } from "react";
import { enhanceMarkdown, renderMarkdown } from "@/lib/markdown";
import type { SlideContent } from "@/lib/schemas";

// 渲染單張投影片：Markdown（消毒後 HTML）或 圖片（PPTX 轉出）。
// animate=true 時套用進場動畫（播放器用；編輯預覽維持靜態）。
export function SlideView({ content, animate = false }: { content: unknown; animate?: boolean }) {
  const c = content as SlideContent | undefined;
  const markdown = c?.kind === "markdown" ? c.markdown : "";
  const [html, setHtml] = useState("");
  const mdRef = useRef<HTMLDivElement>(null);
  // 於 client 端渲染並消毒，避免伺服器端 hydration 不一致
  useEffect(() => { setHtml(renderMarkdown(markdown)); }, [markdown]);
  useEffect(() => { void enhanceMarkdown(mdRef.current); }, [html]);

  // 圖片內容在掛載當下即就緒，可立即套用進場動畫。
  if (c?.kind === "image") {
    return (
      <div className={`slide-surface slide-surface-image${animate ? " slide-animate" : ""}`}>
        <img src={c.src} alt={c.alt ?? ""} draggable={false} />
      </div>
    );
  }
  // Markdown 於 client 端非同步渲染（先空、後填），若在空白時就套用進場動畫，
  // 會出現「外框先淡入、內容稍後才上浮」兩段動畫，看似重複執行。
  // 因此等 HTML 就緒後才加上 slide-animate，讓外框與內容一次同步進場。
  const base = `slide-surface${animate && html ? " slide-animate" : ""}`;
  return (
    <div className={base}>
      <div className="slide-md" ref={mdRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
