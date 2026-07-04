"use client";
import { type FormEvent, useEffect, useState } from "react";
import { Copy, ExternalLink, Link2, RotateCcw } from "lucide-react";

type LinkAnalytics = { viewCount: number; uniqueVisitors: number; completionRate: number; dropOffSlide: number | null; dropOffCount: number; lastViewedAt: string | null };
type ShareLink = { id: string; token: string; label: string | null; allowDownload: boolean; expiresAt: string | null; revokedAt: string | null; createdAt: string; hasPassword: boolean; analytics?: LinkAnalytics };

export function ShareLinkManager({ deckId }: { deckId: string }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch(`/api/decks/${deckId}/share-links`);
    if (response.ok) setLinks(await response.json());
  }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expires = String(form.get("expiresAt") || "");
    const response = await fetch(`/api/decks/${deckId}/share-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: String(form.get("label") || ""),
        password: String(form.get("password") || ""),
        allowDownload: form.get("allowDownload") === "on",
        expiresAt: expires ? new Date(expires).toISOString() : null,
      }),
    });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({}))).error || "建立失敗");
      return;
    }
    event.currentTarget.reset();
    setMessage("已建立分享連結");
    await load();
  }
  async function revoke(id: string) {
    const response = await fetch(`/api/decks/${deckId}/share-links/${id}`, { method: "PATCH" });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || "撤銷失敗");
    await load();
  }
  function shareUrl(token: string) {
    return `${window.location.origin}/s/${token}`;
  }
  return <div className="manager-stack">
    <form className="manager-form" onSubmit={create}>
      <div className="field"><label>連結名稱</label><input className="input" name="label" maxLength={80} placeholder="例如：客戶提案" /></div>
      <div className="field"><label>到期時間</label><input className="input" name="expiresAt" type="datetime-local" /></div>
      <div className="field"><label>分享密碼</label><input className="input" name="password" type="password" minLength={6} autoComplete="new-password" placeholder="選填" /></div>
      <label className="check-row"><input name="allowDownload" type="checkbox" /> 允許下載 PDF</label>
      <button className="btn small"><Link2 size={15} />建立分享連結</button>
      {message && <p className={message.includes("失敗") ? "error" : "muted"}>{message}</p>}
    </form>
    <div className="manager-list">
      {links.length ? links.map((link) => {
        const active = !link.revokedAt && (!link.expiresAt || new Date(link.expiresAt).getTime() > Date.now());
        return <article className="manager-item" key={link.id}>
          <div><strong>{link.label || "未命名連結"}</strong><p className="muted">{active ? "有效" : "已失效"} · {link.hasPassword ? "有密碼" : "無密碼"} · {link.allowDownload ? "可下載" : "不可下載"}{link.expiresAt ? ` · 到期 ${new Date(link.expiresAt).toLocaleString("zh-TW")}` : ""}</p></div>
          <div className="share-metrics">
            <span><b>{link.analytics?.viewCount ?? 0}</b>觀看</span>
            <span><b>{link.analytics?.uniqueVisitors ?? 0}</b>訪客</span>
            <span><b>{link.analytics?.completionRate ?? 0}%</b>完成</span>
            <span><b>{link.analytics?.dropOffSlide ? `第 ${link.analytics.dropOffSlide} 頁後` : "無"}</b>流失</span>
          </div>
          <div className="manager-actions"><a className="btn secondary small" href={`/s/${link.token}`} target="_blank"><ExternalLink size={14} /></a><button className="btn secondary small" onClick={() => navigator.clipboard.writeText(shareUrl(link.token))}><Copy size={14} /></button><button className="btn secondary small" disabled={!active} onClick={() => revoke(link.id)}><RotateCcw size={14} />撤銷</button></div>
        </article>;
      }) : <div className="empty compact">尚未建立分享連結</div>}
    </div>
  </div>;
}
