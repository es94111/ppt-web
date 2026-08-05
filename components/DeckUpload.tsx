"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, Loader2 } from "lucide-react";

export function DeckUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState<"md" | "pptx" | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const mdRef = useRef<HTMLInputElement>(null);
  const pptxRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, endpoint: string, kind: "md" | "pptx") {
    setBusy(kind);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch(endpoint, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ type: "error", text: data.error || "上傳失敗" }); return; }
      router.push(`/decks/${data.id}/edit`);
    } catch {
      setMsg({ type: "error", text: "上傳失敗，請稍後再試" });
    } finally {
      setBusy(null);
      if (mdRef.current) mdRef.current.value = "";
      if (pptxRef.current) pptxRef.current.value = "";
    }
  }

  return (
    <aside className="upload-panel">
      <h2>上傳簡報</h2>
      <p className="muted">匯入 Markdown 檔或 PowerPoint 檔，快速建立一份新簡報。</p>
      <input ref={mdRef} type="file" hidden accept=".md,.markdown,text/markdown" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "/api/decks/import/markdown", "md")} />
      <button className="upload-tile" disabled={!!busy} onClick={() => mdRef.current?.click()}>
        {busy === "md" ? <Loader2 className="spin" size={20} /> : <FileUp size={20} />}
        <div><strong>Markdown 檔</strong><span className="muted">.md / .markdown · 可編輯</span></div>
      </button>
      <input ref={pptxRef} type="file" hidden accept=".pptx" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "/api/decks/import/pptx", "pptx")} />
      <button className="upload-tile" disabled={!!busy} onClick={() => pptxRef.current?.click()}>
        {busy === "pptx" ? <Loader2 className="spin" size={20} /> : <FileText size={20} />}
        <div><strong>PowerPoint 檔</strong><span className="muted">.pptx · 自動轉為可編輯 Markdown</span></div>
      </button>
      {msg && <p className={msg.type === "error" ? "error" : "muted"}>{msg.text}</p>}
    </aside>
  );
}
