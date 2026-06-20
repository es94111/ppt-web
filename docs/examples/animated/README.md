# 旗艦級動畫簡報範例（SlideForge 原生）

這些範例是 **SlideForge 原生 Markdown**，可直接在網站播放——不需要任何外部工具。播放時會有**投影片進場 + 內容逐項浮現**動畫（尊重系統「減少動態效果」設定）。

## 怎麼用

1. 登入後到儀表板右側「上傳簡報」，選 `.md` 檔上傳；或
2. 新增簡報後，把檔案內容貼進 Markdown 編輯器。

> 動畫只在**播放模式**（`/d/<id>`）呈現；編輯器預覽為靜態，方便對齊內容。

## 安全版面類別（`s-*`）

SlideForge 的渲染會移除 `<style>`、inline CSS 與 JS（防 XSS），但**保留 `<div class="...">`**。因此精美版面是透過一組**預先定義好的安全類別**達成，而非自由 CSS。

| 類別 | 用途 |
|---|---|
| `s-slide` | 全幅投影片容器（垂直置中）。每張投影片包一層 |
| `s-dark` / `s-light` | 深色 / 淺色主題（疊在 `s-slide` 上）|
| `s-center` | 內容置中對齊 |
| `s-kicker` / `s-chapter` | 小標／章節標籤（大寫、字距、品牌色）|
| `s-lead` | 大字副標 |
| `s-gradient` | 漸層文字（用 `<span>` 包關鍵字）|
| `s-pill` | 圓角標籤 |
| `s-cols` / `s-cols-3` | 兩欄 / 三欄網格 |
| `s-card` | 卡片 |
| `s-metric` | 數據卡（`<b>數字</b><span>說明</span>`）|
| `s-quote` | 引言／重點框 |
| `s-orb` `s-orb-a` `s-orb-b` | 裝飾光球（會緩慢浮動；放在投影片內容**最後**）|

## 撰寫規則（重要）

- 投影片之間用單獨一行的 `---` 分頁。
- **包裹用的 `<div>` 前後要留空行**，Markdown 才會被正確解析：

```markdown
<div class="s-slide s-dark s-center">

<div class="s-kicker">INTRODUCING</div>

# 標題可用 <span class="s-gradient">漸層</span>

<p class="s-lead">副標文字</p>

<div class="s-orb s-orb-a"></div>

</div>
```

- 純文字 Markdown（不包 `s-slide`）也能用，會套用預設主題並有進場動畫——見上層 `docs/examples/` 的 01–04 範例。
