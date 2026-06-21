"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SettingsForm({ name, email, role, googleEnabled, googleLinked }: { name: string; email: string; role: string; googleEnabled: boolean; googleLinked: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const value = String(new FormData(event.currentTarget).get("name"));
    const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value }) });
    setMessage(response.ok ? "已儲存" : "儲存失敗");
    if (response.ok) router.refresh();
  }

  async function linkGoogle() {
    const response = await fetch("/api/settings/google-link", { method: "POST" });
    if (!response.ok) {
      setMessage((await response.json()).error || "無法開始 Google 綁定");
      return;
    }
    await signIn("google", { redirectTo: "/settings" });
  }

  return <div style={{ maxWidth: 560 }}>
    <form className="card" onSubmit={submit}>
      <div className="field"><label>顯示名稱</label><input className="input" name="name" defaultValue={name} required maxLength={80} /></div>
      <div className="field"><label>Email</label><input className="input" value={email} disabled /></div>
      <div className="field"><label>角色</label><input className="input" value={role} disabled /></div>
      {message && <p className={message === "已儲存" ? "success" : "error"}>{message}</p>}
      <button className="btn">儲存設定</button>
    </form>
    {googleEnabled && <div className="card" style={{ marginTop: 20 }}>
      <h3>Google 帳號</h3>
      <p className="muted">{googleLinked ? "已綁定 Google 帳號，可直接使用 Google 登入。" : `使用與 ${email} 相同且已驗證的 Google Email 進行綁定。`}</p>
      <button className="btn secondary" type="button" disabled={googleLinked} onClick={linkGoogle}>{googleLinked ? "已綁定" : "綁定 Google 帳號"}</button>
    </div>}
  </div>;
}
