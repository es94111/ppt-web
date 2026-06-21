"use client";

import { useState } from "react";

export function RegistrationSettings({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function update(next: boolean) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/settings/registration", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowPublicRegistration: next }),
    });
    if (response.ok) {
      setEnabled(next);
      setMessage("設定已儲存");
    } else {
      setMessage((await response.json()).error || "儲存失敗");
    }
    setSaving(false);
  }

  return <div className="card" style={{ marginBottom: 24 }}>
    <div className="section-head">
      <div><h3>公開註冊</h3><p className="muted">開放後，訪客可使用 Email 或首次 Google 登入建立帳號。</p></div>
      <button className={`btn ${enabled ? "secondary" : ""}`} disabled={saving} onClick={() => update(!enabled)}>{saving ? "儲存中…" : enabled ? "關閉公開註冊" : "開放公開註冊"}</button>
    </div>
    <span className={`badge ${enabled ? "USER" : "GUEST"}`}>{enabled ? "目前開放" : "目前關閉"}</span>
    {message && <span className="muted" style={{ marginLeft: 12 }}>{message}</span>}
  </div>;
}
