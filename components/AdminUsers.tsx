"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER" | "GUEST";
  isActive: boolean;
  createdAt: Date;
};

export function AdminUsers({ users, currentId }: { users: User[]; currentId: string }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function role(id: string, value: string) {
    const response = await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: value }),
    });
    if (!response.ok) alert((await response.json()).error);
    router.refresh();
  }

  async function status(id: string, value: boolean) {
    const response = await fetch(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: value }),
    });
    if (!response.ok) alert((await response.json()).error);
    router.refresh();
  }

  async function remove(user: User) {
    if (!confirm(`確定要永久刪除 ${user.name || user.email}？\n\n此使用者建立的簡報也會一併刪除，且無法復原。`)) return;
    setDeletingId(user.id);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!response.ok) alert((await response.json()).error);
    setDeletingId(null);
    router.refresh();
  }

  return <div className="table-wrap"><table>
    <thead><tr><th>使用者</th><th>角色</th><th>狀態</th><th>註冊時間</th><th>操作</th></tr></thead>
    <tbody>{users.map((user) => <tr key={user.id}>
      <td><strong>{user.name || "未命名"}</strong><br /><span className="muted">{user.email}</span></td>
      <td><select className="input" value={user.role} onChange={(event) => role(user.id, event.target.value)}><option value="ADMIN">Admin</option><option value="USER">User</option><option value="GUEST">Guest</option></select></td>
      <td><span className={`badge ${user.role}`}>{user.isActive ? "有效" : "停用"}</span></td>
      <td>{new Date(user.createdAt).toLocaleDateString("zh-TW")}</td>
      <td><div className="actions">
        <button className="btn secondary small" disabled={user.id === currentId} onClick={() => status(user.id, !user.isActive)}>{user.isActive ? "停用" : "啟用"}</button>
        <button className="btn secondary small" disabled={user.id === currentId || deletingId === user.id} onClick={() => remove(user)}><Trash2 size={14} />{deletingId === user.id ? "刪除中…" : "刪除"}</button>
      </div></td>
    </tr>)}</tbody>
  </table></div>;
}
