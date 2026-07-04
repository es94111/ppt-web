"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Crosshair, Download, LayoutGrid, LogOut, Maximize2, Monitor, StickyNote, X } from "lucide-react";
import type { BrandKit } from "@/lib/brand";
import { SlideView } from "./SlideView";

type Slide = { id: string; order: number; content: unknown; notes?: string | null };
type ViewMode = "slide" | "overview";
export function Viewer({ deckId, title, slides, exitHref, downloadHref, shareToken, brandKit }: { deckId: string; title: string; slides: Slide[]; exitHref: string; downloadHref?: string; shareToken?: string; brandKit?: BrandKit | null }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("slide");
  const stageRef = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());
  const currentSlide = slides[index];
  const nextSlide = slides[index + 1];
  const currentSlideOrder = currentSlide?.order;
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
      if (e.key.toLowerCase() === "p") setPresenterOpen((open) => !open);
      if (e.key === "Escape") {
        setLaserEnabled(false);
        setPresenterOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, viewMode]);
  useEffect(() => {
    if (!presenterOpen) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [presenterOpen]);
  useEffect(() => {
    if (!currentSlideOrder) return;
    const controller = new AbortController();
    void fetch(`/api/decks/${deckId}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slideOrder: currentSlideOrder, shareToken }), signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [deckId, currentSlideOrder, shareToken]);
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
  function formatElapsed(seconds: number) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }
  if (!slides.length) return <div className="viewer"><header className="viewer-head"><h1>{title}</h1><button className="btn secondary small" onClick={exitViewer}><LogOut size={16} />離開簡報</button></header><div className="empty">此簡報沒有投影片</div></div>;
  return (
    <div className={`viewer${laserEnabled && viewMode === "slide" ? " laser-active" : ""}`} onPointerMove={moveLaser} onPointerLeave={() => { if (laserRef.current) laserRef.current.style.opacity = "0"; }}>
      <header className="viewer-head"><h1>{title}</h1><div className="viewer-head-actions"><span className="muted">唯讀模式</span>{downloadHref && <a className="btn secondary small" href={downloadHref} target="_blank"><Download size={16} />PDF</a>}<button className="btn secondary small" onClick={exitViewer}><LogOut size={16} />離開簡報</button></div></header>
      {viewMode === "slide" && <><button aria-label="上一頁" className="click-zone left" onClick={() => go(index - 1)} /><button aria-label="下一頁" className="click-zone right" onClick={() => go(index + 1)} /></>}
      <div className={`viewer-stage${viewMode === "overview" ? " overview" : ""}`} ref={stageRef}>
        {viewMode === "slide" ? <div className="viewer-canvas"><SlideView key={index} content={slides[index].content} animate brandKit={brandKit} /></div> : <div className="overview-grid">
          {slides.map((slide, slideIndex) => <button className={`overview-slide${slideIndex === index ? " selected" : ""}`} key={slide.id} onClick={() => { setIndex(slideIndex); changeViewMode("slide"); }}><SlideView content={slide.content} brandKit={brandKit} /><span>{slideIndex + 1}</span></button>)}
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
        <button className={`btn secondary small${presenterOpen ? " active" : ""}`} aria-pressed={presenterOpen} title="講者模式（P）" onClick={() => setPresenterOpen((open) => !open)}><StickyNote size={17} />講者</button>
        <button className="btn secondary small" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={17} /></button>
      </footer>
      {presenterOpen && <div className="presenter-backdrop">
        <section className="presenter-console" aria-label="講者模式">
          <header className="presenter-head">
            <div><span className="badge dark">Presenter</span><h2>{title}</h2></div>
            <button className="icon-btn dark" aria-label="關閉講者模式" onClick={() => setPresenterOpen(false)}><X size={20} /></button>
          </header>
          <div className="presenter-stats">
            <span><Clock size={18} />{formatElapsed(elapsedSeconds)}</span>
            <span>第 {index + 1} / {slides.length} 頁</span>
          </div>
          <div className="presenter-grid">
            <article className="presenter-notes">
              <h3>講者備註</h3>
              <div>{currentSlide.notes?.trim() ? currentSlide.notes.split("\n").map((line, i) => <p key={i}>{line || "\u00a0"}</p>) : <p className="muted">這頁沒有講者備註。可在 Markdown 投影片下方加入獨立一行 <code>???</code> 後撰寫。</p>}</div>
            </article>
            <article className="presenter-next">
              <h3>下一頁預覽</h3>
              {nextSlide ? <SlideView content={nextSlide.content} brandKit={brandKit} /> : <div className="presenter-end">已是最後一頁</div>}
            </article>
          </div>
          <footer className="presenter-actions">
            <button className="btn secondary small" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} />上一頁</button>
            <button className="btn small" disabled={index === slides.length - 1} onClick={() => go(index + 1)}>下一頁<ChevronRight size={18} /></button>
          </footer>
        </section>
      </div>}
      <div className="laser-pointer" ref={laserRef} aria-hidden="true" />
    </div>
  );
}
