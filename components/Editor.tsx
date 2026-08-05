"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, FileDown, History, LayoutTemplate, MessageSquare, Palette, Pencil, Play, RotateCcw, Settings2, Share2, Users, WandSparkles, X } from "lucide-react";
import { normalizeBrandKit, type BrandKit } from "@/lib/brand";
import { SlideView } from "./SlideView";
import { AIAssistant } from "./AIAssistant";
import { BrandKitManager } from "./BrandKitManager";
import { CollaboratorManager } from "./CollaboratorManager";
import { CommentReview } from "./CommentReview";
import { ShareLinkManager } from "./ShareLinkManager";
import { splitMarkdownSlides, markdownToContent } from "@/lib/slides";
import { slideTemplates } from "@/lib/slide-templates";

type Deck = { id: string; title: string; description: string | null; visibility: string; hasPassword: boolean; initialMarkdown: string; category: string | null; tags: string[]; slides: { id: string; order: number }[]; canManage: boolean; brandKit: BrandKit };
type Revision = { id: string; title: string; slideCount: number; createdAt: string; preview: string };

export function Editor({ deck }: { deck: Deck }) {
  const router = useRouter();
  const [md, setMd] = useState(deck.initialMarkdown);
  const [state, setState] = useState("已儲存");
  const [showSettings, setShowSettings] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [mobileMode, setMobileMode] = useState<"edit" | "preview">("edit");
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionState, setRevisionState] = useState("");
  const [settingsVisibility, setSettingsVisibility] = useState(deck.visibility === "PASSWORD" ? "PUBLIC" : deck.visibility);
  const [brandKit, setBrandKit] = useState(deck.brandKit);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function insertTemplate(markdown: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? md.length;
    const end = textarea?.selectionEnd ?? md.length;
    const before = md.slice(0, start);
    const after = md.slice(end);
    const prefix = before.trim() ? "\n\n---\n\n" : "";
    const suffix = after.trim() ? "\n\n---\n\n" : "";
    const next = `${before}${prefix}${markdown}${suffix}${after}`;
    onChange(next);
    setShowTemplates(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      const pos = before.length + prefix.length + markdown.length;
      textarea?.setSelectionRange(pos, pos);
    });
  }

  function getSelectedText() {
    const textarea = textareaRef.current;
    if (!textarea) return "";
    return md.slice(textarea.selectionStart, textarea.selectionEnd);
  }

  function applyAiText(text: string, mode: "replaceAll" | "replaceSelection" | "insert") {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? md.length;
    const end = textarea?.selectionEnd ?? md.length;
    let next = text;
    let cursor = text.length;
    if (mode === "insert") {
      const before = md.slice(0, start);
      const after = md.slice(start);
      const prefix = before.trim() ? "\n\n---\n\n" : "";
      const suffix = after.trim() ? "\n\n---\n\n" : "";
      next = `${before}${prefix}${text}${suffix}${after}`;
      cursor = before.length + prefix.length + text.length;
    } else if (mode === "replaceSelection" && start !== end) {
      next = `${md.slice(0, start)}${text}${md.slice(end)}`;
      cursor = start + text.length;
    }
    onChange(next);
    setShowAI(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  async function openRevisions() {
    setShowRevisions(true);
    setRevisionState("載入中…");
    const response = await fetch(`/api/decks/${deck.id}/revisions`);
    if (!response.ok) {
      setRevisionState((await response.json().catch(() => ({}))).error || "無法載入版本歷史");
      return;
    }
    setRevisions(await response.json());
    setRevisionState("");
  }

  async function restoreRevision(revisionId: string) {
    if (!confirm("確定還原到這個版本？目前內容會先自動保存成一份歷史版本。")) return;
    setRevisionState("還原中…");
    if (timer.current) clearTimeout(timer.current);
    const response = await fetch(`/api/decks/${deck.id}/revisions/${revisionId}/restore`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setRevisionState(data.error || "還原失敗");
      return;
    }
    setMd(data.markdown);
    setState("已還原");
    setShowRevisions(false);
    router.refresh();
  }

  async function saveSettings(form: FormData) {
    const tags = String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const payload: Record<string, unknown> = { title: form.get("title"), description: form.get("description"), tags };
    // 可見性、密碼、分類僅擁有者可送出，與後端授權界線一致。
    if (deck.canManage) {
      const removePassword = form.get("removePassword") === "on";
      payload.visibility = String(form.get("visibility"));
      payload.password = removePassword ? null : String(form.get("password") || "") || undefined;
      payload.category = form.get("category");
    }
    const r = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    setShowSettings(false);
    router.refresh();
  }

  async function saveBrand(form: FormData) {
    const clearBrand = form.get("clearBrand") === "on";
    const brand = clearBrand ? {
      name: "",
      logoUrl: "",
      primaryColor: "",
      accentColor: "",
      font: "",
      footer: "",
    } : {
      name: String(form.get("brandName") || ""),
      logoUrl: String(form.get("brandLogoUrl") || ""),
      primaryColor: String(form.get("brandPrimaryColor") || ""),
      accentColor: String(form.get("brandAccentColor") || ""),
      font: String(form.get("brandFont") || ""),
      footer: String(form.get("brandFooter") || ""),
    };
    const response = await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand }),
    });
    if (!response.ok) { alert((await response.json()).error); return; }
    setBrandKit(normalizeBrandKit({ ...brand, font: brand.font as BrandKit["font"] }));
    setShowBrand(false);
    router.refresh();
  }

  return (
    <div className="md-editor">
      <header className="md-toolbar">
        <strong className="md-title">{deck.title}</strong>
        <span className="md-hint"><code>---</code> 分頁 · <code>???</code> 講者備註</span>
        <span className={`save-state${state.includes("失敗") ? " error" : ""}`}>{state}</span>
        <button className="btn secondary small" onClick={() => setShowAI(true)}><WandSparkles size={15} />AI</button>
        <button className="btn secondary small" onClick={() => setShowTemplates(true)}><LayoutTemplate size={15} />範本</button>
        {deck.canManage && <button className="btn secondary small" onClick={() => setShowBrand(true)}><Palette size={15} />品牌</button>}
        {deck.canManage && <button className="btn secondary small" onClick={() => setShowShare(true)}><Share2 size={15} />分享</button>}
        {deck.canManage && <button className="btn secondary small" onClick={() => setShowCollaborators(true)}><Users size={15} />協作者</button>}
        <button className="btn secondary small" onClick={() => setShowComments(true)}><MessageSquare size={15} />留言</button>
        <button className="btn secondary small" onClick={openRevisions}><History size={15} />歷史</button>
        <button className="btn secondary small" onClick={() => setShowSettings(true)}><Settings2 size={15} />設定</button>
        <a className="btn secondary small" href={`/decks/${deck.id}/logs`}><BarChart3 size={15} />分析</a>
        <a className="btn secondary small" href={`/decks/${deck.id}/export/pdf`} target="_blank"><FileDown size={15} />PDF</a>
        <button className="btn secondary small mobile-preview-toggle" onClick={() => setMobileMode((m) => m === "edit" ? "preview" : "edit")}>{mobileMode === "edit" ? <Eye size={15} /> : <Pencil size={15} />}{mobileMode === "edit" ? "預覽" : "編輯"}</button>
        <a className="btn small" href={`/d/${deck.id}`}><Play size={15} />播放</a>
      </header>

      <div className={`md-body${mobileMode === "preview" ? " mobile-preview" : ""}`}>
        <section className="md-source">
          <textarea
            ref={textareaRef}
            className="md-textarea"
            value={md}
            spellCheck={false}
            placeholder={"# 第一頁標題\n\n歡迎\n\n???\n這裡寫講者備註，不會出現在投影片上。\n\n---\n\n## 第二頁\n\n- 重點一\n- 重點二"}
            onChange={(e) => onChange(e.target.value)}
          />
        </section>
        <section className="md-preview">
          {slides.map((s, i) => (
            <div className="md-preview-item" key={i}>
              <span className="md-preview-num">{i + 1}</span>
              <div className="md-preview-frame"><SlideView content={markdownToContent(s)} brandKit={brandKit} /></div>
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
              <div className="field"><label>標籤</label><input className="input" name="tags" defaultValue={deck.tags.join(", ")} maxLength={260} placeholder="用逗號分隔，例如 SaaS, Q3, 教學" /></div>
              {/* 分類、可見性與密碼屬於分享／管理設定，僅擁有者可調整 */}
              {deck.canManage && <>
                <div className="field"><label>分類</label><input className="input" name="category" defaultValue={deck.category ?? ""} maxLength={40} placeholder="例如：產品提案、教育課程" /></div>
                <div className="field"><label>可見性</label>
                  <select className="input" name="visibility" value={settingsVisibility} onChange={(e) => setSettingsVisibility(e.target.value)}>
                    <option value="PRIVATE">私人</option>
                    <option value="AUTHENTICATED">限登入觀看</option>
                    <option value="PUBLIC">公開</option>
                    <option value="UNLISTED">不公開列表</option>
                  </select>
                </div>
                {settingsVisibility === "PUBLIC" && <div className="field">
                  <label>{deck.hasPassword ? "更換密碼（留空則保留目前密碼）" : "公開簡報密碼（選填）"}</label>
                  <input className="input" name="password" type="password" minLength={10} autoComplete="new-password" />
                  <small className="muted">設定密碼後，簡報仍會出現在公開列表，但訪客必須先輸入密碼。</small>
                  {deck.hasPassword && <label><input name="removePassword" type="checkbox" /> 移除密碼保護</label>}
                </div>}
              </>}
              <div className="actions"><button className="btn small">儲存設定</button></div>
            </form>
          </div>
        </div>
      )}

      {showAI && (
        <div className="modal-backdrop" onMouseDown={() => setShowAI(false)}>
          <div className="modal modal-ai" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>AI 簡報助理</h2><button className="icon-btn" onClick={() => setShowAI(false)}><X size={18} /></button></div>
            <AIAssistant deckId={deck.id} markdown={md} getSelectedText={getSelectedText} onApply={applyAiText} />
          </div>
        </div>
      )}

      {showBrand && (
        <div className="modal-backdrop" onMouseDown={() => setShowBrand(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>品牌套件</h2><button className="icon-btn" onClick={() => setShowBrand(false)}><X size={18} /></button></div>
            <BrandKitManager brandKit={brandKit} onSave={saveBrand} />
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="modal-backdrop" onMouseDown={() => setShowTemplates(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>插入版型</h2><button className="icon-btn" onClick={() => setShowTemplates(false)}><X size={18} /></button></div>
            <div className="template-grid">
              {slideTemplates.map((template) => (
                <button className="template-tile" key={template.id} onClick={() => insertTemplate(template.markdown)}>
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="modal-backdrop" onMouseDown={() => setShowShare(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>分享連結</h2><button className="icon-btn" onClick={() => setShowShare(false)}><X size={18} /></button></div>
            <ShareLinkManager deckId={deck.id} />
          </div>
        </div>
      )}

      {showCollaborators && (
        <div className="modal-backdrop" onMouseDown={() => setShowCollaborators(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>協作者</h2><button className="icon-btn" onClick={() => setShowCollaborators(false)}><X size={18} /></button></div>
            <CollaboratorManager deckId={deck.id} />
          </div>
        </div>
      )}

      {showComments && (
        <div className="modal-backdrop" onMouseDown={() => setShowComments(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>留言審閱</h2><button className="icon-btn" onClick={() => setShowComments(false)}><X size={18} /></button></div>
            <CommentReview deckId={deck.id} slides={deck.slides} />
          </div>
        </div>
      )}

      {showRevisions && (
        <div className="modal-backdrop" onMouseDown={() => setShowRevisions(false)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>版本歷史</h2><button className="icon-btn" onClick={() => setShowRevisions(false)}><X size={18} /></button></div>
            {revisionState && <p className={revisionState.includes("失敗") || revisionState.includes("無法") ? "error" : "muted"}>{revisionState}</p>}
            {!revisionState && !revisions.length && <div className="empty compact">尚未建立版本快照。持續編輯一段時間後會自動保存。</div>}
            <div className="revision-list">
              {revisions.map((revision) => (
                <article className="revision-item" key={revision.id}>
                  <div>
                    <strong>{new Date(revision.createdAt).toLocaleString("zh-TW")}</strong>
                    <p className="muted">{revision.slideCount} 頁 · {revision.preview || "空白版本"}</p>
                  </div>
                  <button className="btn secondary small" onClick={() => restoreRevision(revision.id)}><RotateCcw size={14} />還原</button>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
