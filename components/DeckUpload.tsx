"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Presentation } from "lucide-react";

type Busy = "" | "md" | "pptx";

export function DeckUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>("");
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const mdRef = useRef<HTMLInputElement>(null);
  const pptxRef = useRef<HTMLInputElement>(null);

  async function upload(kind: "md" | "pptx", file: File) {
    setBusy(kind);
    setMsg(kind === "pptx" ? { type: "info", text: "PPTX 轉檔中，請稍候…" } : null);
    const fd = new FormData();
    fd.append("file", file);
    const url = kind === "md" ? "/api/decks/import/markdown" : "/api/decks/import/pptx";
    try {
      const r = await fetch(url, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ type: "error", text: data.error || "上傳失敗" }); return; }
      if (kind === "md") router.push(`/decks/${data.id}/edit`);
      else router.push(`/d/${data.id}`);
    } catch {
      setMsg({ type: "error", text: "上傳失敗，請稍後再試" });
    } finally {
      setBusy("");
      if (mdRef.current) mdRef.current.value = "";
      if (pptxRef.current) pptxRef.current.value = "";
    }
  }

  return (
    <aside className="upload-panel">
      <h2>上傳簡報</h2>
      <p className="muted">匯入 Markdown 或 PowerPoint 檔，快速建立一份新簡報。</p>
      <input ref={mdRef} type="file" hidden accept=".md,.markdown,text/markdown" onChange={(e) => e.target.files?.[0] && upload("md", e.target.files[0])} />
      <input ref={pptxRef} type="file" hidden accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => e.target.files?.[0] && upload("pptx", e.target.files[0])} />
      <button className="upload-tile" disabled={!!busy} onClick={() => mdRef.current?.click()}>
        {busy === "md" ? <Loader2 className="spin" size={20} /> : <FileUp size={20} />}
        <div><strong>Markdown 檔</strong><span className="muted">.md / .markdown · 可編輯</span></div>
      </button>
      <button className="upload-tile" disabled={!!busy} onClick={() => pptxRef.current?.click()}>
        {busy === "pptx" ? <Loader2 className="spin" size={20} /> : <Presentation size={20} />}
        <div><strong>PowerPoint 檔</strong><span className="muted">.pptx · 轉圖唯讀</span></div>
      </button>
      {msg && <p className={msg.type === "error" ? "error" : "muted"}>{msg.text}</p>}
    </aside>
  );
}
