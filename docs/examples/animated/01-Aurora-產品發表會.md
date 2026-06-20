---
theme: seriph
title: Aurora — AI 工作空間
info: |
  精美產品發表會範例
transition: fade-out
mdc: true
colorSchema: dark
fonts:
  sans: Noto Sans TC
  mono: JetBrains Mono
---

<div class="orb orb-a" />
<div class="orb orb-b" />

<div class="kicker" v-motion :initial="{ opacity: 0, y: 18 }" :enter="{ opacity: 1, y: 0, transition: { delay: 150 } }">
  INTRODUCING AURORA
</div>

# 工作，不該被工具打斷。

<p class="lead" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 500 } }">
一個理解團隊脈絡、主動推進工作的 AI 工作空間。
</p>

<div class="pill" v-motion :initial="{ opacity: 0, scale: .85 }" :enter="{ opacity: 1, scale: 1, transition: { delay: 900 } }">
2026.06 · TAIPEI
</div>

---
transition: slide-left
---

<div class="chapter">01 · THE PROBLEM</div>

# 我們每天切換<br><span class="gradient-text">1,200 次</span>工作情境。

<div class="metric-grid">
  <div class="metric" v-click>
    <b>47%</b><span>時間花在找資料</span>
  </div>
  <div class="metric" v-click>
    <b>3.2h</b><span>每日被訊息中斷</span>
  </div>
  <div class="metric" v-click>
    <b>68%</b><span>決策沒有完整紀錄</span>
  </div>
</div>

<p class="footnote" v-after>資料不是不存在，而是散落在錯誤的地方。</p>

---
transition: view-transition
---

<div class="chapter">02 · THE SHIFT</div>

# 從「找工具」到<br>「工具理解你」。

<div class="compare">
  <div class="compare-card old" v-click>
    <span>BEFORE</span>
    <h3>人追著資訊跑</h3>
    <p>搜尋、複製、確認、重新整理</p>
  </div>
  <div class="arrow" v-click>→</div>
  <div class="compare-card new" v-click>
    <span>WITH AURORA</span>
    <h3>資訊主動抵達</h3>
    <p>理解、連結、提醒、自動推進</p>
  </div>
</div>

---
transition: slide-up
---

<div class="chapter">03 · THE PRODUCT</div>

# 一個畫面，掌握所有進度。

<div class="product-shell" v-motion :initial="{ opacity: 0, scale: .92, y: 30 }" :enter="{ opacity: 1, scale: 1, y: 0 }">
  <div class="product-top"><i/><i/><i/><span>Aurora Workspace</span></div>
  <div class="product-body">
    <div class="sidebar">⌘<br>◎<br>◇<br>◌</div>
    <div class="workspace">
      <small>GOOD MORNING, MAY</small>
      <h2>今天有 3 件事需要你</h2>
      <div class="task"><b>01</b><span>確認 Q3 定價決策</span><em>現在</em></div>
      <div class="task"><b>02</b><span>回覆設計審查意見</span><em>11:30</em></div>
      <div class="task"><b>03</b><span>準備客戶成功週報</span><em>自動草稿</em></div>
    </div>
  </div>
</div>

---
transition: fade
---

<div class="chapter">04 · INTELLIGENCE</div>

# Aurora 不只回答，<br><span class="gradient-text">它會採取行動。</span>

<v-clicks>

- 整理會議決策，建立後續任務
- 發現風險，通知正確的負責人
- 依據團隊資料產生可追溯的答案
- 在權限邊界內安全執行工作流程

</v-clicks>

<div class="pulse-core" v-motion :initial="{ scale: .7, opacity: 0 }" :enter="{ scale: 1, opacity: 1 }">AI</div>

---
transition: slide-left
---

<div class="chapter">05 · IMPACT</div>

# 把時間，還給真正重要的事。

<div class="impact-row">
  <div v-click><strong>−42%</strong><span>資訊搜尋時間</span></div>
  <div v-click><strong>2.6×</strong><span>決策落地速度</span></div>
  <div v-click><strong>+31</strong><span>團隊 NPS</span></div>
</div>

<div class="quote" v-after>「第一次，我們的工作空間真的知道團隊正在做什麼。」</div>

---
layout: center
transition: fade-out
---

<div class="orb orb-c" />

<div class="kicker">AURORA · AVAILABLE NOW</div>

# 準備好，進入工作的下一個時代。

<p class="lead">aurora.example.com</p>

<div class="pill">START FREE →</div>

<style>
:root { --violet:#8b5cf6; --cyan:#22d3ee; --ink:#070812; }
.slidev-layout { background:var(--ink); color:#f7f7fb; padding:64px 72px; overflow:hidden; }
.slidev-layout h1 { font-size:3.35rem; line-height:1.08; letter-spacing:-.055em; font-weight:760; margin:20px 0; }
.slidev-layout h2 { letter-spacing:-.035em; }
.kicker,.chapter { color:#9e93ff; font-size:.72rem; letter-spacing:.22em; font-weight:800; }
.lead { color:#a8a9b8; font-size:1.2rem; max-width:690px; }
.pill { display:inline-flex; border:1px solid #ffffff24; background:#ffffff0d; padding:10px 18px; border-radius:99px; font-size:.72rem; letter-spacing:.12em; margin-top:28px; backdrop-filter:blur(10px); }
.gradient-text { background:linear-gradient(90deg,#a78bfa,#22d3ee); color:transparent; background-clip:text; }
.orb { position:absolute; border-radius:999px; filter:blur(1px); opacity:.5; pointer-events:none; }
.orb-a { width:420px;height:420px;right:-150px;top:-150px;background:radial-gradient(circle,#7c3aed,transparent 68%);animation:float 7s ease-in-out infinite; }
.orb-b { width:360px;height:360px;left:-180px;bottom:-180px;background:radial-gradient(circle,#0891b2,transparent 68%);animation:float 9s ease-in-out infinite reverse; }
.orb-c { width:700px;height:700px;left:50%;top:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#6d28d955,transparent 62%);animation:pulse 4s ease-in-out infinite; }
.metric-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:44px; }
.metric { padding:26px;border:1px solid #ffffff16;background:#ffffff08;border-radius:18px; }
.metric b { display:block;font-size:2.2rem;color:#c4b5fd; }.metric span,.impact-row span{display:block;color:#8d8f9f;font-size:.82rem;margin-top:8px}.footnote{color:#77798b;margin-top:28px}
.compare{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:center;margin-top:44px}.compare-card{padding:28px;border-radius:20px;border:1px solid #ffffff16}.compare-card span{font-size:.68rem;letter-spacing:.17em}.compare-card p{color:#8f91a0}.old{background:#ffffff06}.new{background:linear-gradient(145deg,#6d28d922,#0891b222);box-shadow:0 0 50px #7c3aed18}.arrow{font-size:2rem;color:#8b5cf6}
.product-shell{border:1px solid #ffffff20;border-radius:18px;background:#10111d;overflow:hidden;box-shadow:0 25px 70px #0008;margin-top:28px}.product-top{height:38px;background:#171823;display:flex;align-items:center;gap:7px;padding:0 14px;color:#77798b;font-size:.7rem}.product-top i{width:7px;height:7px;border-radius:50%;background:#4b4d59}.product-top span{margin-left:10px}.product-body{display:grid;grid-template-columns:54px 1fr;min-height:300px}.sidebar{border-right:1px solid #ffffff10;text-align:center;line-height:3.5;color:#77798b}.workspace{padding:30px}.workspace small{color:#8176ea;letter-spacing:.15em}.workspace h2{font-size:1.55rem}.task{display:grid;grid-template-columns:38px 1fr auto;padding:12px 0;border-top:1px solid #ffffff0d;align-items:center}.task b{color:#6d6f80}.task em{font-style:normal;color:#77798b;font-size:.72rem}
.pulse-core{position:absolute;right:120px;top:190px;width:180px;height:180px;border-radius:50%;display:grid;place-items:center;font-size:2rem;font-weight:800;background:radial-gradient(circle at 35% 30%,#c4b5fd,#6d28d9 55%,#0891b2);box-shadow:0 0 0 20px #8b5cf60d,0 0 0 45px #22d3ee08;animation:pulse 3s ease-in-out infinite}
.impact-row{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:54px}.impact-row div{padding:26px 0;border-top:1px solid #ffffff25}.impact-row strong{font-size:2.4rem;color:#a78bfa}.quote{margin-top:36px;padding:18px 22px;border-left:2px solid #22d3ee;color:#b8bac8;background:#ffffff06}
@keyframes float{50%{transform:translateY(24px) translateX(-12px)}}@keyframes pulse{50%{opacity:.72;transform:scale(1.04)}}
</style>

