"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { SlideView } from "./SlideView";

type Slide = { id: string; order: number; content: unknown };
export function Viewer({ deckId, title, slides }: { deckId: string; title: string; slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  function go(next: number) { setIndex(Math.max(0, Math.min(slides.length - 1, next))); }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index]);
  useEffect(() => {
    fetch(`/api/decks/${deckId}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slideOrder: slides[index]?.order }) });
  }, [deckId, index, slides]);
  if (!slides.length) return <div className="viewer"><div className="empty">此簡報沒有投影片</div></div>;
  return (
    <div className="viewer">
      <header className="viewer-head"><h1>{title}</h1><span className="muted">唯讀模式</span></header>
      <button aria-label="上一頁" className="click-zone left" onClick={() => go(index - 1)} />
      <button aria-label="下一頁" className="click-zone right" onClick={() => go(index + 1)} />
      <div className="viewer-stage"><div className="viewer-canvas"><SlideView key={index} content={slides[index].content} animate /></div></div>
      <footer className="viewer-controls">
        <button className="btn secondary small" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} /></button>
        <strong>{index + 1} / {slides.length}</strong>
        <button className="btn secondary small" disabled={index === slides.length - 1} onClick={() => go(index + 1)}><ChevronRight size={18} /></button>
        <button className="btn secondary small" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={17} /></button>
      </footer>
    </div>
  );
}
