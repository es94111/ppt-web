import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  return <main><div className="container hero">
    <div><div className="eyebrow">Web-native presentations</div><h1>讓想法，<br/>直接在瀏覽器裡發光。</h1><p>建立、編輯與安全分享投影片。角色權限、密碼保護和逐頁瀏覽稽核，全部集中在同一個平台。</p><div className="actions">
      <Link className="btn" href={session ? "/dashboard" : "/register"}>{session ? "進入工作區" : "建立第一份簡報"}</Link>
      {!session && <Link className="btn secondary" href="/login">已有帳號</Link>}
    </div></div>
    <div className="hero-card"><div className="mini-slide"><span>SLIDE 01</span><h2>Ideas deserve<br/>a better stage.</h2></div></div>
  </div></main>;
}
