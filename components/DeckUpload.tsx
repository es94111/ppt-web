"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";

export function DeckUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const mdRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/decks/import/markdown", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ type: "error", text: data.error || "上傳失敗" }); return; }
      router.push(`/decks/${data.id}/edit`);
    } catch {
      setMsg({ type: "error", text: "上傳失敗，請稍後再試" });
    } finally {
      setBusy(false);
      if (mdRef.current) mdRef.current.value = "";
    }
  }

  return (
    <aside className="upload-panel">
      <h2>上傳簡報</h2>
      <p className="muted">匯入 Markdown 檔，快速建立一份新簡報。</p>
      <input ref={mdRef} type="file" hidden accept=".md,.markdown,text/markdown" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button className="upload-tile" disabled={busy} onClick={() => mdRef.current?.click()}>
        {busy ? <Loader2 className="spin" size={20} /> : <FileUp size={20} />}
        <div><strong>Markdown 檔</strong><span className="muted">.md / .markdown · 可編輯</span></div>
      </button>
      {msg && <p className={msg.type === "error" ? "error" : "muted"}>{msg.text}</p>}
    </aside>
  );
}
