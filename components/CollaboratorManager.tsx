"use client";
import { type FormEvent, useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";

type Collaborator = { id: string; role: "VIEWER" | "COMMENTER" | "EDITOR"; user: { name: string | null; email: string } };

export function CollaboratorManager({ deckId }: { deckId: string }) {
  const [items, setItems] = useState<Collaborator[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch(`/api/decks/${deckId}/collaborators`);
    if (response.ok) setItems(await response.json());
  }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/decks/${deckId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
    });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({}))).error || "加入失敗");
      return;
    }
    event.currentTarget.reset();
    setMessage("已更新協作者");
    await load();
  }
  async function update(id: string, role: Collaborator["role"]) {
    await fetch(`/api/decks/${deckId}/collaborators/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    await load();
  }
  async function remove(id: string) {
    await fetch(`/api/decks/${deckId}/collaborators/${id}`, { method: "DELETE" });
    await load();
  }
  return <div className="manager-stack">
    <form className="manager-form inline" onSubmit={submit}>
      <input className="input" name="email" type="email" placeholder="協作者 Email" required />
      <select className="input" name="role" defaultValue="COMMENTER"><option value="VIEWER">可觀看</option><option value="COMMENTER">可留言</option><option value="EDITOR">可編輯</option></select>
      <button className="btn small"><UserPlus size={15} />加入</button>
    </form>
    {message && <p className={message.includes("失敗") ? "error" : "muted"}>{message}</p>}
    <div className="manager-list">{items.length ? items.map((item) => <article className="manager-item" key={item.id}><div><strong>{item.user.name || item.user.email}</strong><p className="muted">{item.user.email}</p></div><div className="manager-actions"><select className="input compact-input" value={item.role} onChange={(e) => update(item.id, e.target.value as Collaborator["role"])}><option value="VIEWER">可觀看</option><option value="COMMENTER">可留言</option><option value="EDITOR">可編輯</option></select><button className="icon-btn" aria-label="移除協作者" title="移除協作者" onClick={() => remove(item.id)}><X size={16} /></button></div></article>) : <div className="empty compact">尚未加入協作者</div>}</div>
  </div>;
}
