"use client";
import { useState } from "react";
import { Check, FileText, Loader2, MessageSquareText, Scissors, WandSparkles } from "lucide-react";

type ApplyMode = "replaceAll" | "replaceSelection" | "insert";
type AiAction = "draft" | "rewrite" | "shorten" | "tone" | "notes";

export function AIAssistant({ deckId, markdown, getSelectedText, onApply }: { deckId: string; markdown: string; getSelectedText: () => string; onApply: (text: string, mode: ApplyMode) => void }) {
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState("決策者與團隊成員");
  const [tone, setTone] = useState("清楚、專業、有說服力");
  const [slideCount, setSlideCount] = useState(6);
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const selectedText = getSelectedText();

  async function run(action: AiAction) {
    setBusy(action);
    setMessage("");
    setResult("");
    const currentSelection = getSelectedText();
    const source = currentSelection || markdown;
    const response = await fetch(`/api/decks/${deckId}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        input,
        markdown,
        selectedText: action === "draft" || action === "notes" ? undefined : currentSelection || undefined,
        audience,
        tone,
        slideCount,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error || "AI 助理暫時無法使用");
      return;
    }
    setResult(data.text || "");
    setMessage(data.provider === "local" ? "已用本機草稿器產生結果；設定 AI_API_KEY 與 AI_MODEL 後會改用外部 AI。" : "AI 已產生結果");
    if (action !== "draft" && !source.trim()) setMessage("目前沒有內容可處理，請先輸入或選取文字。");
  }

  return (
    <div className="ai-panel">
      <div className="ai-grid">
        <section className="ai-card">
          <h3><WandSparkles size={17} />AI 簡報助理</h3>
          <textarea className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="輸入主題、簡報目標，或貼上長文..." />
          <div className="ai-fields">
            <label>聽眾<input className="input" value={audience} maxLength={120} onChange={(event) => setAudience(event.target.value)} /></label>
            <label>頁數<input className="input" type="number" min={3} max={12} value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} /></label>
          </div>
          <button className="btn small" onClick={() => run("draft")} disabled={busy !== null}>{busy === "draft" ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}產生草稿</button>
        </section>

        <section className="ai-card">
          <h3><Scissors size={17} />AI 改寫與濃縮</h3>
          <label>語氣<input className="input" value={tone} maxLength={40} onChange={(event) => setTone(event.target.value)} /></label>
          <p className="muted">會優先處理目前選取文字；沒有選取時處理整份簡報。</p>
          <div className="actions">
            <button className="btn secondary small" onClick={() => run("rewrite")} disabled={busy !== null}>{busy === "rewrite" ? <Loader2 size={15} className="spin" /> : <WandSparkles size={15} />}改寫</button>
            <button className="btn secondary small" onClick={() => run("shorten")} disabled={busy !== null}>{busy === "shorten" ? <Loader2 size={15} className="spin" /> : <Scissors size={15} />}縮短</button>
            <button className="btn secondary small" onClick={() => run("tone")} disabled={busy !== null}>{busy === "tone" ? <Loader2 size={15} className="spin" /> : <MessageSquareText size={15} />}調語氣</button>
          </div>
        </section>

        <section className="ai-card">
          <h3><MessageSquareText size={17} />AI 講者備註</h3>
          <p className="muted">根據每頁投影片內容產生 `???` 講稿，播放時可在講者模式查看。</p>
          <button className="btn secondary small" onClick={() => run("notes")} disabled={busy !== null}>{busy === "notes" ? <Loader2 size={15} className="spin" /> : <MessageSquareText size={15} />}產生講稿</button>
        </section>
      </div>

      {message && <p className={message.includes("無法") || message.includes("沒有內容") ? "error" : "muted"}>{message}</p>}
      {result && <section className="ai-result">
        <div className="modal-head"><h3>產生結果</h3><div className="actions">
          {selectedText && <button className="btn secondary small" onClick={() => onApply(result, "replaceSelection")}><Check size={15} />取代選取</button>}
          <button className="btn secondary small" onClick={() => onApply(result, "insert")}><Check size={15} />插入</button>
          <button className="btn small" onClick={() => onApply(result, "replaceAll")}><Check size={15} />套用整份</button>
        </div></div>
        <textarea className="input ai-output" value={result} onChange={(event) => setResult(event.target.value)} />
      </section>}
    </div>
  );
}
