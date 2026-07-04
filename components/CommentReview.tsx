"use client";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquarePlus, RotateCcw } from "lucide-react";

type SlideOption = { id: string; order: number };
type Comment = { id: string; body: string; resolvedAt: string | null; createdAt: string; author: { name: string | null; email: string } | null; slide: { order: number } };

export function CommentReview({ deckId, slides }: { deckId: string; slides: SlideOption[] }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  async function load() {
    const response = await fetch(`/api/decks/${deckId}/comments`);
    if (response.ok) setComments(await response.json());
  }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/decks/${deckId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideId: form.get("slideId"), body: form.get("body") }),
    });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({}))).error || "留言失敗");
      return;
    }
    event.currentTarget.reset();
    setMessage("");
    await load();
  }
  async function resolve(id: string, resolved: boolean) {
    await fetch(`/api/decks/${deckId}/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved }) });
    await load();
  }
  return <div className="manager-stack">
    <form className="manager-form" onSubmit={submit}>
      <div className="field"><label>投影片</label><select className="input" name="slideId">{orderedSlides.map((slide) => <option key={slide.id} value={slide.id}>第 {slide.order} 頁</option>)}</select></div>
      <div className="field"><label>留言</label><textarea className="input" name="body" maxLength={2000} required placeholder="留下修改建議或審閱意見" /></div>
      <button className="btn small"><MessageSquarePlus size={15} />新增留言</button>
      {message && <p className="error">{message}</p>}
    </form>
    <div className="manager-list">{comments.length ? comments.map((comment) => <article className={`manager-item comment-item${comment.resolvedAt ? " resolved" : ""}`} key={comment.id}><div><strong>第 {comment.slide.order} 頁 · {comment.author?.name || comment.author?.email || "匿名"}</strong><p>{comment.body}</p><small className="muted">{new Date(comment.createdAt).toLocaleString("zh-TW")}</small></div><button className="btn secondary small" onClick={() => resolve(comment.id, !comment.resolvedAt)}>{comment.resolvedAt ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}{comment.resolvedAt ? "重開" : "解決"}</button></article>) : <div className="empty compact">尚無留言</div>}</div>
  </div>;
}
