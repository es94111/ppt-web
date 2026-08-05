"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, FileDown, Play, Share2, X } from "lucide-react";
import { PptxViewer } from "./PptxViewer";
import { ShareLinkManager } from "./ShareLinkManager";

type PptxEditorDeck = { id: string; title: string; sourceUrl: string; fileName: string; canManage: boolean };

export function PptxEditor({ deck }: { deck: PptxEditorDeck }) {
  const [saveState, setSaveState] = useState("已儲存");
  const [showShare, setShowShare] = useState(false);
  const pending = useRef<Uint8Array | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushSave(), 900);
  }

  function queueSave(content: Uint8Array) {
    pending.current = content;
    setSaveState("等待儲存");
    scheduleSave();
  }

  async function flushSave() {
    if (saving.current || !pending.current) return;
    saving.current = true;
    const content = pending.current;
    pending.current = null;
    setSaveState("儲存中…");
    try {
      const form = new FormData();
      form.append("file", new File([content as unknown as BlobPart], deck.fileName, { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
      const response = await fetch(`/api/decks/${deck.id}/import/pptx`, { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "儲存失敗");
      setSaveState("已儲存");
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      saving.current = false;
      if (pending.current) scheduleSave();
    }
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div className="pptx-editor">
      <header className="pptx-editor-toolbar">
        <strong className="pptx-editor-title">{deck.title}</strong>
        <span className={`pptx-editor-save-state${saveState.includes("失敗") ? " error" : ""}`}>{saveState}</span>
        {deck.canManage && <button className="btn secondary small" onClick={() => setShowShare(true)}><Share2 size={15} />分享</button>}
        <a className="btn secondary small" href={`/decks/${deck.id}/logs`}><BarChart3 size={15} />分析</a>
        <a className="btn secondary small" href={`/decks/${deck.id}/export/pdf`} target="_blank"><FileDown size={15} />PDF</a>
        <a className="btn small" href={`/d/${deck.id}`}><Play size={15} />播放</a>
      </header>
      <div className="pptx-editor-body">
        <PptxViewer sourceUrl={deck.sourceUrl} fileName={deck.fileName} canEdit onContentChange={queueSave} />
      </div>
      {showShare && (
        <div className="modal-backdrop" onMouseDown={() => setShowShare(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>分享連結</h2><button className="icon-btn" onClick={() => setShowShare(false)}><X size={18} /></button></div>
            <ShareLinkManager deckId={deck.id} />
          </div>
        </div>
      )}
    </div>
  );
}
