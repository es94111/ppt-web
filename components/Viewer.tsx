"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Crosshair, LayoutGrid, LogOut, Maximize2, Monitor } from "lucide-react";
import { SlideView } from "./SlideView";

type Slide = { id: string; order: number; content: unknown };
type ViewMode = "slide" | "overview";
export function Viewer({ deckId, title, slides, exitHref }: { deckId: string; title: string; slides: Slide[]; exitHref: string }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("slide");
  const stageRef = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLDivElement>(null);
  function go(next: number) { setIndex(Math.max(0, Math.min(slides.length - 1, next))); }
  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "overview") setLaserEnabled(false);
  }
  async function exitViewer() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    router.push(exitHref);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLButtonElement) return;
      if (viewMode === "slide" && (e.key === "ArrowRight" || e.key === " ")) go(index + 1);
      if (viewMode === "slide" && e.key === "ArrowLeft") go(index - 1);
      if (viewMode === "slide" && e.key.toLowerCase() === "l") setLaserEnabled((enabled) => !enabled);
      if (e.key.toLowerCase() === "g") changeViewMode(viewMode === "slide" ? "overview" : "slide");
      if (e.key === "Escape") setLaserEnabled(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, viewMode]);
  useEffect(() => {
    fetch(`/api/decks/${deckId}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slideOrder: slides[index]?.order }) });
  }, [deckId, index, slides]);
  useEffect(() => {
    if (!laserEnabled && laserRef.current) laserRef.current.style.opacity = "0";
  }, [laserEnabled]);
  function moveLaser(event: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    const laser = laserRef.current;
    if (!laserEnabled || !stage || !laser) return;
    const bounds = stage.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    laser.style.opacity = inside ? "1" : "0";
    if (inside) laser.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
  }
  if (!slides.length) return <div className="viewer"><header className="viewer-head"><h1>{title}</h1><button className="btn secondary small" onClick={exitViewer}><LogOut size={16} />離開簡報</button></header><div className="empty">此簡報沒有投影片</div></div>;
  return (
    <div className={`viewer${laserEnabled && viewMode === "slide" ? " laser-active" : ""}`} onPointerMove={moveLaser} onPointerLeave={() => { if (laserRef.current) laserRef.current.style.opacity = "0"; }}>
      <header className="viewer-head"><h1>{title}</h1><div className="viewer-head-actions"><span className="muted">唯讀模式</span><button className="btn secondary small" onClick={exitViewer}><LogOut size={16} />離開簡報</button></div></header>
      {viewMode === "slide" && <><button aria-label="上一頁" className="click-zone left" onClick={() => go(index - 1)} /><button aria-label="下一頁" className="click-zone right" onClick={() => go(index + 1)} /></>}
      <div className={`viewer-stage${viewMode === "overview" ? " overview" : ""}`} ref={stageRef}>
        {viewMode === "slide" ? <div className="viewer-canvas"><SlideView key={index} content={slides[index].content} animate /></div> : <div className="overview-grid">
          {slides.map((slide, slideIndex) => <button className={`overview-slide${slideIndex === index ? " selected" : ""}`} key={slide.id} onClick={() => { setIndex(slideIndex); changeViewMode("slide"); }}><SlideView content={slide.content} /><span>{slideIndex + 1}</span></button>)}
        </div>}
      </div>
      <footer className="viewer-controls">
        <button className="btn secondary small" disabled={viewMode === "overview" || index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} /></button>
        <strong>{index + 1} / {slides.length}</strong>
        <button className="btn secondary small" disabled={viewMode === "overview" || index === slides.length - 1} onClick={() => go(index + 1)}><ChevronRight size={18} /></button>
        <div className="view-mode-switch" aria-label="檢視方式">
          <button className={`btn secondary small${viewMode === "slide" ? " active" : ""}`} aria-pressed={viewMode === "slide"} title="單頁檢視" onClick={() => changeViewMode("slide")}><Monitor size={17} />單頁</button>
          <button className={`btn secondary small${viewMode === "overview" ? " active" : ""}`} aria-pressed={viewMode === "overview"} title="投影片總覽（G）" onClick={() => changeViewMode("overview")}><LayoutGrid size={17} />總覽</button>
        </div>
        <button className={`btn secondary small${laserEnabled ? " active laser" : ""}`} disabled={viewMode === "overview"} aria-pressed={laserEnabled} title="雷射筆（L）" onClick={() => setLaserEnabled((enabled) => !enabled)}><Crosshair size={17} />雷射筆</button>
        <button className="btn secondary small" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={17} /></button>
      </footer>
      <div className="laser-pointer" ref={laserRef} aria-hidden="true" />
    </div>
  );
}
