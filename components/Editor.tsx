"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Play, Settings2, X } from "lucide-react";
import { SlideView } from "./SlideView";
import { splitMarkdownSlides, markdownToContent } from "@/lib/slides";

type Deck = { id: string; title: string; description: string | null; visibility: string; initialMarkdown: string };

export function Editor({ deck }: { deck: Deck }) {
  const router = useRouter();
  const [md, setMd] = useState(deck.initialMarkdown);
  const [state, setState] = useState("已儲存");
  const [showSettings, setShowSettings] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo(() => splitMarkdownSlides(md), [md]);

  function onChange(next: string) {
    setMd(next);
    setState("等待儲存");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 700);
  }

  async function save(value: string) {
    setState("儲存中…");
    const r = await fetch(`/api/decks/${deck.id}/markdown`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: value }),
    });
    setState(r.ok ? "已儲存" : "儲存失敗");
  }

  async function saveSettings(form: FormData) {
    const visibility = String(form.get("visibility"));
    const password = String(form.get("password") || "") || undefined;
    const r = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), description: form.get("description"), visibility, password }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    setShowSettings(false);
    router.refresh();
  }

  return (
    <div className="md-editor">
      <header className="md-toolbar">
        <strong className="md-title">{deck.title}</strong>
        <span className="md-hint">用獨立一行的 <code>---</code> 分頁</span>
        <span className="save-state">{state}</span>
        <button className="btn secondary small" onClick={() => setShowSettings(true)}><Settings2 size={15} />設定</button>
        <a className="btn secondary small" href={`/decks/${deck.id}/logs`}><BarChart3 size={15} />分析</a>
        <a className="btn small" href={`/d/${deck.id}`}><Play size={15} />播放</a>
      </header>

      <div className="md-body">
        <section className="md-source">
          <textarea
            className="md-textarea"
            value={md}
            spellCheck={false}
            placeholder={"# 第一頁標題\n\n歡迎\n\n---\n\n## 第二頁\n\n- 重點一\n- 重點二"}
            onChange={(e) => onChange(e.target.value)}
          />
        </section>
        <section className="md-preview">
          {slides.map((s, i) => (
            <div className="md-preview-item" key={i}>
              <span className="md-preview-num">{i + 1}</span>
              <div className="md-preview-frame"><SlideView content={markdownToContent(s)} /></div>
            </div>
          ))}
        </section>
      </div>

      {showSettings && (
        <div className="modal-backdrop" onMouseDown={() => setShowSettings(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>簡報設定</h2><button className="icon-btn" onClick={() => setShowSettings(false)}><X size={18} /></button></div>
            <form action={saveSettings}>
              <div className="field"><label>標題</label><input className="input" name="title" defaultValue={deck.title} maxLength={150} required /></div>
              <div className="field"><label>描述</label><textarea className="input" name="description" defaultValue={deck.description ?? ""} maxLength={1000} /></div>
              <div className="field"><label>可見性</label>
                <select className="input" name="visibility" defaultValue={deck.visibility}>
                  <option value="PRIVATE">私人</option>
                  <option value="PUBLIC">公開（登入者）</option>
                  <option value="UNLISTED">不公開列表</option>
                  <option value="PASSWORD">密碼保護</option>
                </select>
              </div>
              <div className="field"><label>新密碼（選填，密碼保護用）</label><input className="input" name="password" type="password" minLength={6} /></div>
              <div className="actions"><button className="btn small">儲存設定</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
