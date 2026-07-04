"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SharePassword({ token, title }: { token: string; title: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch(`/api/share-links/${token}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError((await response.json().catch(() => ({}))).error || "密碼錯誤");
      setBusy(false);
      return;
    }
    router.refresh();
  }
  return <div className="viewer"><div className="password-box"><span className="badge">SHARE</span><h1>{title}</h1><p className="muted">這個分享連結受到密碼保護。</p><form onSubmit={submit}><div className="field"><label>分享密碼</label><input className="input" name="password" type="password" autoFocus required /></div>{error && <p className="error">{error}</p>}<button className="btn" disabled={busy}>{busy ? "驗證中…" : "解鎖分享連結"}</button></form></div></div>;
}
