export type SlideTemplate = {
  id: string;
  name: string;
  description: string;
  markdown: string;
};

export const slideTemplates: SlideTemplate[] = [
  {
    id: "cover",
    name: "旗艦封面",
    description: "產品發表、提案或專案簡報的第一頁。",
    markdown: `<div class="s-slide s-dark s-center">
<div class="s-kicker">SlideForge</div>
<h1><span class="s-gradient">簡報標題</span></h1>
<p class="s-lead">用一句話說清楚這份簡報要帶來的價值。</p>
<div class="s-pill">2026 · Team Name</div>
</div>`,
  },
  {
    id: "agenda",
    name: "議程大綱",
    description: "適合會議開場或課程章節導覽。",
    markdown: `<div class="s-slide s-light">
<div class="s-kicker">Agenda</div>
<h1>今天會完成三件事</h1>
<div class="s-cols-3">
<div class="s-card"><h3>01</h3><p>現況與目標</p></div>
<div class="s-card"><h3>02</h3><p>方案與取捨</p></div>
<div class="s-card"><h3>03</h3><p>時程與下一步</p></div>
</div>
</div>`,
  },
  {
    id: "metrics",
    name: "數據亮點",
    description: "展示 KPI、成長率、轉換率等指標。",
    markdown: `<div class="s-slide s-dark">
<div class="s-kicker">Highlights</div>
<h1>本季關鍵數字</h1>
<div class="s-cols-3">
<div class="s-card s-metric"><b>42%</b><span>活躍用戶成長</span></div>
<div class="s-card s-metric"><b>3.8x</b><span>分享轉換提升</span></div>
<div class="s-card s-metric"><b>12k</b><span>累計瀏覽</span></div>
</div>
</div>`,
  },
  {
    id: "two-column",
    name: "雙欄比較",
    description: "比較 Before/After、方案 A/B 或問題/解法。",
    markdown: `<div class="s-slide s-light">
<div class="s-kicker">Comparison</div>
<h1>從現況走到理想狀態</h1>
<div class="s-cols">
<div class="s-card">
<h2>現在</h2>
<ul>
<li>流程分散</li>
<li>難追蹤成效</li>
<li>交付成本高</li>
</ul>
</div>
<div class="s-card">
<h2>導入後</h2>
<ul>
<li>集中管理</li>
<li>即時分析</li>
<li>可快速分享</li>
</ul>
</div>
</div>
</div>`,
  },
  {
    id: "quote",
    name: "重點金句",
    description: "放大願景、使用者回饋或關鍵洞察。",
    markdown: `<div class="s-slide s-dark s-center">
<div class="s-kicker">Insight</div>
<blockquote class="s-quote">真正好的工具不是增加操作，而是讓好想法更快抵達聽眾。</blockquote>
<p class="s-lead">把這句話換成你的核心觀點。</p>
</div>`,
  },
  {
    id: "course",
    name: "課程章節",
    description: "教育訓練、工作坊與課堂簡報。",
    markdown: `<div class="s-slide s-light">
<div class="s-chapter">Lesson 02</div>
<h1>本章學習目標</h1>
<ul>
<li>理解核心概念與適用情境</li>
<li>完成一個小型實作練習</li>
<li>能說明常見錯誤與修正方式</li>
</ul>
</div>`,
  },
  {
    id: "closing",
    name: "結尾行動",
    description: "用清楚的下一步收束簡報。",
    markdown: `<div class="s-slide s-dark s-center">
<div class="s-kicker">Next Step</div>
<h1>接下來我們只需要一個決定</h1>
<p class="s-lead">確認方向、指派負責人，並在下週完成第一版。</p>
<div class="s-pill">Q&A</div>
</div>`,
  },
];
