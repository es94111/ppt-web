import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { auth, signOut } from "@/auth";
import { Presentation } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = { title: "SlideForge", description: "安全、現代的線上投影片平台" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return <html lang="zh-Hant"><body className={`${inter.variable} ${jakarta.variable}`}>
    <header className="nav"><div className="container nav-inner">
      <Link className="logo" href="/"><span className="logo-mark"><Presentation size={20}/></span>SlideForge</Link>
      <nav className="nav-links">
        <Link href="/">探索</Link>
        {session?.user ? <>
          <Link className="hide-mobile" href="/dashboard">我的簡報</Link>
          {session.user.role === "ADMIN" && <Link className="hide-mobile" href="/admin/users">管理後台</Link>}
          <Link className="hide-mobile" href="/settings">設定</Link>
          <span className={`badge ${session.user.role}`}>{session.user.role}</span>
          <form action={async()=>{"use server";await signOut({redirectTo:"/"})}}><button className="btn secondary small">登出</button></form>
        </> : <><Link href="/login">登入</Link><Link className="btn small" href="/register">免費開始</Link></>}
      </nav>
    </div></header>{children}
  </body></html>;
}
