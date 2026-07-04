"use client";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { hasBrandKit, normalizeBrandKit, type BrandKit } from "@/lib/brand";
import { enhanceMarkdown, renderMarkdown } from "@/lib/markdown";
import type { SlideContent } from "@/lib/schemas";

// 渲染單張投影片：Markdown（消毒後 HTML）或 圖片（PPTX 轉出）。
// animate=true 時套用進場動畫（播放器用；編輯預覽維持靜態）。
export function SlideView({ content, animate = false, brandKit = null }: { content: unknown; animate?: boolean; brandKit?: BrandKit | null }) {
  const c = content as SlideContent | undefined;
  const markdown = c?.kind === "markdown" ? c.markdown : "";
  const [html, setHtml] = useState("");
  const mdRef = useRef<HTMLDivElement>(null);
  const brand = normalizeBrandKit(brandKit);
  const branded = hasBrandKit(brand);
  const brandStyle = branded ? {
    "--deck-brand-primary": brand.primaryColor ?? "#2563eb",
    "--deck-brand-accent": brand.accentColor ?? "#f59e0b",
    "--deck-brand-font": fontFamily(brand.font),
  } as CSSProperties : undefined;
  const brandOverlay = branded ? <>
    {brand.logoUrl && <img className="slide-brand-logo" src={brand.logoUrl} alt={brand.name ? `${brand.name} logo` : "Logo"} draggable={false} />}
    {(brand.footer || brand.name) && <div className="slide-brand-footer"><span>{brand.footer || brand.name}</span></div>}
  </> : null;
  // 於 client 端渲染並消毒，避免伺服器端 hydration 不一致
  useEffect(() => { setHtml(renderMarkdown(markdown)); }, [markdown]);
  useEffect(() => { void enhanceMarkdown(mdRef.current); }, [html]);

  // 圖片內容在掛載當下即就緒，可立即套用進場動畫。
  if (c?.kind === "image") {
    return (
      <div className={`slide-surface slide-surface-image${branded ? " branded" : ""}${animate ? " slide-animate" : ""}`} style={brandStyle}>
        <img src={c.src} alt={c.alt ?? ""} draggable={false} />
        {brandOverlay}
      </div>
    );
  }
  // Markdown 於 client 端非同步渲染（先空、後填），若在空白時就套用進場動畫，
  // 會出現「外框先淡入、內容稍後才上浮」兩段動畫，看似重複執行。
  // 因此等 HTML 就緒後才加上 slide-animate，讓外框與內容一次同步進場。
  const base = `slide-surface${branded ? " branded" : ""}${animate && html ? " slide-animate" : ""}`;
  return (
    <div className={base} style={brandStyle}>
      <div className="slide-md" ref={mdRef} dangerouslySetInnerHTML={{ __html: html }} />
      {brandOverlay}
    </div>
  );
}

function fontFamily(font: BrandKit["font"]) {
  if (font === "display") return "var(--font-display)";
  if (font === "serif") return "Georgia, 'Times New Roman', serif";
  if (font === "mono") return "var(--font-mono)";
  return "var(--font-sans)";
}
