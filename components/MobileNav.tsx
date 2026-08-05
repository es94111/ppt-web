"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// 行動版導覽：桌面版隱藏，手機板以漢堡選單展開主要連結。
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button className="icon-btn" aria-label={open ? "關閉選單" : "開啟選單"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="mobile-menu">
          <Link href="/" onClick={() => setOpen(false)}>探索</Link>
          <Link href="/dashboard" onClick={() => setOpen(false)}>我的簡報</Link>
          {isAdmin && <Link href="/admin/users" onClick={() => setOpen(false)}>管理後台</Link>}
          <Link href="/settings" onClick={() => setOpen(false)}>設定</Link>
        </div>
      )}
    </div>
  );
}
