"use client";
import type { CSSProperties } from "react";
import { Image, Palette, Type } from "lucide-react";
import type { BrandKit } from "@/lib/brand";

export function BrandKitManager({ brandKit, onSave }: { brandKit: BrandKit; onSave: (formData: FormData) => void | Promise<void> }) {
  return (
    <form className="brand-form" action={onSave}>
      <div className="brand-form-grid">
        <div className="field"><label>品牌名稱</label><input className="input" name="brandName" defaultValue={brandKit.name ?? ""} maxLength={80} placeholder="例如 SlideForge" /></div>
        <div className="field"><label><Image size={14} />Logo URL</label><input className="input" name="brandLogoUrl" defaultValue={brandKit.logoUrl ?? ""} maxLength={2048} placeholder="https://... 或 /logo.png" /></div>
        <div className="field"><label><Palette size={14} />品牌主色</label><input className="input color-input" name="brandPrimaryColor" type="color" defaultValue={brandKit.primaryColor ?? "#2563eb"} /></div>
        <div className="field"><label><Palette size={14} />強調色</label><input className="input color-input" name="brandAccentColor" type="color" defaultValue={brandKit.accentColor ?? "#f59e0b"} /></div>
        <div className="field"><label><Type size={14} />字體風格</label><select className="input" name="brandFont" defaultValue={brandKit.font ?? "system"}>
          <option value="system">系統無襯線</option>
          <option value="display">標題字體</option>
          <option value="serif">襯線字體</option>
          <option value="mono">等寬字體</option>
        </select></div>
        <div className="field"><label>頁尾文字</label><input className="input" name="brandFooter" defaultValue={brandKit.footer ?? ""} maxLength={120} placeholder="公司名稱、保密等級或活動名稱" /></div>
      </div>
      <div className="brand-preview" style={{ "--preview-primary": brandKit.primaryColor ?? "#2563eb", "--preview-accent": brandKit.accentColor ?? "#f59e0b" } as CSSProperties}>
        <strong>{brandKit.name || "品牌預覽"}</strong>
        <span>{brandKit.footer || "頁尾會顯示在投影片底部"}</span>
      </div>
      <label className="check-row"><input name="clearBrand" type="checkbox" /> 清除品牌套件</label>
      <div className="actions"><button className="btn small" type="submit">儲存品牌套件</button></div>
    </form>
  );
}
