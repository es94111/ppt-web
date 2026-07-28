# SlideForge — 軟體需求規格書（SRS）

> 內部開發文件，可保留技術術語。完整設計請見 [`docs/開發文件.md`](docs/開發文件.md)。

## 1. 目的與範圍

SlideForge 是以 Next.js 全端建構的線上投影片平台，提供網頁原生的投影片建立、編輯、瀏覽，並具備角色權限、簡報密碼保護與完整的瀏覽稽核（含 IP 記錄）。

## 2. 角色與權限

| 角色 | 權限摘要 |
|------|----------|
| ADMIN | 全站使用者/簡報/稽核管理；首位註冊者自動取得 |
| USER | 建立/編輯/刪除自己的簡報；查看自己簡報的稽核 |
| GUEST | 唯讀瀏覽（依可見性/密碼） |

新註冊預設 `GUEST`；權限於後端 API 強制驗證（前端隱藏僅為體驗）。

## 3. 功能需求

- **FR-AUTH**：Email+密碼 與 Google OAuth 登入；Auth.js（NextAuth v5）；密碼 bcrypt 雜湊；登入/密碼驗證速率限制。
- **FR-ROLE**：Admin 後台調整角色與啟用狀態；至少保留一名 Admin。
- **FR-DECK**：Deck CRUD + 可見性（PRIVATE/PASSWORD/PUBLIC/UNLISTED）+ 密碼設定。
- **FR-SLIDE**：Slide CRUD、排序；content 為 JSON（markdown/image 元素），寫入前 Zod 驗證。
- **FR-EDITOR**：Admin/Owner 可進編輯器；自動存檔；圖片走 S3 相容 presigned upload；內建常用投影片版型庫，可插入封面、議程、數據、雙欄、課程章節與結尾行動等版型。
- **FR-AI**：Markdown 編輯器提供 AI 簡報助理，可由主題/長文產生投影片草稿、針對選取文字或整份簡報改寫/濃縮/調整語氣，並可為每頁自動產生 `???` 講者備註；支援 OpenAI-compatible chat completions，未設定模型時提供本機 fallback。
- **FR-BRAND**：Deck 支援品牌套件欄位（品牌名稱、Logo URL、主色、強調色、字體、頁尾），擁有者/Admin 可管理，編輯預覽、播放與 PDF 匯出需一致套用。
- **FR-MARKDOWN-PLUS**：Markdown 渲染支援 Mermaid、KaTeX 與程式碼高亮；輸出仍需經 DOMPurify 消毒，Mermaid 以 strict security level 執行。
- **FR-NOTES**：Markdown 投影片支援以獨立一行 `???` 分隔講者備註，備註寫入 `Slide.notes`，一般投影片渲染不顯示。
- **FR-VIEWER**：唯讀渲染、上一頁/下一頁、鍵盤、全螢幕、頁碼；播放時支援 Presenter Mode，包含講者備註、下一頁預覽、計時器與目前頁/總頁數。
- **FR-AUDIT**：ViewLog 記錄 user/deck/shareLink/slideOrder/ip/ua/time；Admin 全站查詢、User 自助查詢；單份簡報提供每日趨勢、唯一訪客、熱門投影片、可能流失頁與來源統計，並能依每組分享連結比較觀看次數、完成率與流失頁。
- **FR-REVISION**：Markdown 簡報自動儲存前定期建立 `DeckRevision` 快照，保留最近版本並允許擁有者/Admin 還原。
- **FR-EXPORT**：擁有者/Admin 可開啟列印最佳化的 PDF 匯出頁，將每張投影片以 16:9 橫向頁面列印或另存 PDF。
- **FR-SHARE-LINK**：擁有者/Admin 可為簡報建立多組分享連結；每組連結可設定名稱、到期時間、分享密碼、是否允許 PDF 下載，並可撤銷。
- **FR-COLLAB**：擁有者/Admin 可加入協作者，角色為 VIEWER、COMMENTER、EDITOR；EDITOR 可編輯內容，COMMENTER/EDITOR 可留言與解決留言。
- **FR-DISCOVERY**：Deck 支援 `category` 與多個 Tag；首頁可依關鍵字、分類、標籤搜尋，作者頁展示公開簡報；登入者可收藏/取消收藏公開簡報。

## 4. 非功能需求

- **安全**：argon2/bcrypt 雜湊、後端授權、IDOR 防護、Zod 輸入驗證、輸出消毒（XSS）、Prisma 參數化（注入）、CSP/安全標頭、CSRF、檔案上傳白名單、可信代理 IP 解析。
- **隱私**：IP/UA 屬個資，揭露用途與保存期限（預設 180 天），僅 Admin 可存取全站記錄。
- **美觀/可用性**：Tailwind + shadcn/ui、響應式、深色模式、WCAG AA。
- **可移植性**：Docker 容器化（standalone 輸出），可部署至任何支援 Docker 的平台。

## 5. 技術棧

Next.js 16（App Router）/ TypeScript / PostgreSQL / Prisma / Auth.js / Tailwind + shadcn/ui / S3 相容物件儲存 / Docker。

## 6. 資料模型

`User`、`Deck`（含品牌套件欄位）、`Slide`、`DeckRevision`、`ShareLink`、`DeckCollaborator`、`SlideComment`、`Tag`、`DeckTag`、`Favorite`、`ViewLog`（可關聯 `ShareLink`）及 Auth.js 標準表（`Account`/`Session`）。詳見 `prisma/schema.prisma` 與設計文件 §5。

## 7. 部署與 CI/CD

- Docker / docker-compose（web + postgres + minio）。
- 規劃 GitHub Actions：lint/test/gitleaks → build image → Trivy → push（Docker Hub/GHCR）。詳見設計文件 §13。

## 8. 版本

### 8.1 版號規則

語意化版號 `MAJOR.MINOR.PATCH`。使用者導向的更新摘要見 [`changelog.json`](changelog.json)；公開撰寫規格見 [`.specify/memory/changelog-style.md`](.specify/memory/changelog-style.md)。

### 8.2 版本歷程

| 版本 | 日期 | 說明 |
|------|------|------|
| 2.2.2 | 2026-07-28 | 資安套件升級 + Node runtime 24→26：修補 Dependabot／code scanning 回報之已知漏洞——`next` 16.2.9→16.2.12（Server Actions/rewrites SSRF、cache confusion ×2、Image Optimization SVG DoS、未授權 Server Function endpoint 洩漏、Turbopack middleware bypass、Edge runtime Server Action payload 無上限）；`next-auth` 5.0.0-beta.31→beta.32 + `@auth/core` override 0.41.2→0.41.3（critical：驗證失敗時可能 fail-open 誤判已登入、email homoglyph `@` 繞過；high：`getToken()` 對畸形 Bearer header 拋未捕捉例外）；`postcss` override `^8.5.10`→`^8.5.18`（`sourceMappingURL` path traversal 任意 `.map` 檔洩漏）；`dompurify` `^3.4.11`→`^3.4.12`（`CUSTOM_ELEMENT_HANDLING` 消毒繞過）；`prisma` `^7.9.0`→`^7.9.1`（連帶修復巢狀於 `@prisma/dev` 的 `find-my-way` HTTP/2 DoS 與 `valibot` `flatten()` 例外）；`typescript` `7.0.1-rc`→`7.0.2`（原生 `tsc` binary 內嵌 CVE）；新增 `sharp` override `^0.35.0`（`next` optionalDependency 釘死 `^0.34.5`，排除 libvips 修復版本）。同步將 Dockerfile 三階段與 `docker-publish.yml` 的 `node-version` 由 24 升至 26，與 dependabot 先前已升級的 `@types/node ^26.1.1` 對齊（`.github/dependabot.yml` 對 docker base image major 升級的 ignore 規則僅擋自動提案，不影響本次手動升級）。`npm audit` 由多項 critical/high 降至 0 vulnerabilities。**副作用**：`next` 16.2.10~16.2.12 這段修補版本與現有的 TypeScript 7 原生編譯器（`typescript` native port）互動出現迴歸——本機 Windows 建置在「Skipping validation of types」訊息後直接 SIGSEGV（`next@16.2.11` 則是走另一條路徑，build 中途自行誤判 TS 未安裝並觸發 `npm install` 自我修復，非決定性、不適合 Docker/CI）。改用 Next 提供的 `experimental.useTypeScriptCli: true`（`next.config.ts`）讓建置改走 TypeScript CLI 而非其編譯器 API，segfault 消失且建置內建的型別檢查真正生效（`next build` 印出「Running TypeScript ... Finished TypeScript」而非略過），因此**移除**了原本 v1.7.1 引入的 `typescript.ignoreBuildErrors: true`（已無必要）。Dockerfile builder 階段仍保留獨立 `RUN npm run typecheck`，僅作為比完整 build 快約 10 秒的 fail-fast 關卡，非型別把關的唯一手段。 |
| 2.2.1 | 2026-07-04 | Bug fix：(1) `components/ShareLinkManager.tsx` `create()` 新增 `creating` state 防止重複送出：送出中按鈕 `disabled` 並顯示 `Loader2` spinner；`event.currentTarget` 於 await 前先存成區域變數（避免 React SyntheticEvent pooling 於非同步後被清空存取出錯）；成功後改為樂觀更新（`setLinks` 直接 prepend 新建立的 `ShareLink`、`formEl.reset()`）並仍呼叫 `load()` 背景重新整理，取代原本等待整個 `await load()` 才能看到結果。(2) `.github/workflows/docker-publish.yml`：原本 PR 與 push/tag 事件共用同一個 `docker/metadata-action` 步驟，`images` 無條件包含 `docker.io/${{ secrets.DOCKERHUB_USERNAME }}/ppt-web`；PR（尤其 fork PR）沒有該 secret，會產生 owner 為空字串的無效 image 參照。拆成 `meta-pr`（僅 GHCR、`if: github.event_name == 'pull_request'`）與 `meta-publish`（GHCR + Docker Hub、`if: github.event_name != 'pull_request'`）兩個 metadata 步驟，以及對應的 `Build Docker image`（`push: false`）與 `Build and push Docker image`（`push: true`）兩個 build 步驟，PR 建置僅驗證可建置、不觸碰 Docker Hub 認證。 |
| 2.2.0 | 2026-07-04 | 流量限制與驗證安全強化，新增 `RateLimitBucket` 資料表（migration `20260704030000_rate_limit_bucket`）。(1) `lib/rate-limit.ts` `rateLimit()` 改為 async：正式環境改以 Postgres `RateLimitBucket` 表做原子化 upsert（`INSERT … ON CONFLICT DO UPDATE`），跨實例／重啟持續生效；`NODE_ENV=test` 或未設定 `DATABASE_URL`（非 production）時仍走原本記憶體 Map，production 缺少 `DATABASE_URL` 會直接拋錯；每 256 次呼叫觸發一次過期資料清理。所有呼叫端（`app/api/auth/register`、`auth.ts` credentials login、`app/api/decks/[id]/ai`、`app/api/decks/[id]/verify-password`、`app/api/decks/[id]/view`）改為 `await`。(2) 新增 `app/api/share-links/[token]/verify-password/route.ts` 的 rate limit（8 次/分鐘/token+IP，先前無限流）與 zod 輸入驗證，`shareAccessToken` cookie 於 production 加上 `secure`。(3) `deckUpdateSchema`／`shareLinkCreateSchema` 密碼欄位最短長度 6→10。(4) `lib/google-link.ts` `verifyGoogleLinkToken()`、`lib/security.ts` `verifyDeckAccessToken()`：token 改嚴格檢查切割後片段數，並以 `Number.isFinite` 取代原本 `Number(expires) < Date.now()`（`expires` 非數字時恆為 `NaN`，比較結果恆假，可能誤判過期權杖為有效）。(5) `components/SlideView.tsx` 改 `memo` + 自訂 props 比較（`areSlideViewPropsEqual`）避免不必要重繪，Markdown 渲染改用 `useLayoutEffect`（SSR 端仍用 `useEffect`）避免首幀空白閃爍；`components/Viewer.tsx` 講者計時器僅於 `presenterOpen` 時運作，瀏覽紀錄 POST 加上 `AbortController` 於切換時中止前一筆請求並略過無效頁碼。 |
| 2.1.0 | 2026-07-04 | AI 簡報助理／品牌套件／分享連結成效分析，新增 `Deck` 品牌欄位與 `ViewLog.shareLinkId`（migration `20260704020000_ai_brand_analytics`）。(1) FR-AI：`lib/ai-assistant.ts` `generateDeckAiText()`，`POST /api/decks/[id]/ai`（`deckAiSchema`、每使用者/簡報/IP 20 次/分鐘 rate limit、PPTX 唯讀簡報禁用），draft/rewrite/shorten/tone/notes 五種動作；設定 `AI_API_KEY`+`AI_MODEL`（相容 `OPENAI_API_KEY`/`OPENAI_MODEL`/`OPENAI_BASE_URL`）時呼叫 OpenAI-compatible `/chat/completions`，未設定則走 `fallbackText()` 本機規則式產生器；`components/AIAssistant.tsx` 提供草稿／改寫／濃縮／語氣／講者備註面板，`Editor.tsx` 串接 `applyAiText()`（replaceAll/replaceSelection/insert）。(2) FR-BRAND：`Deck` 新增 `brandName/brandLogoUrl/brandPrimaryColor/brandAccentColor/brandFont/brandFooter`；`lib/brand.ts` `normalizeBrandKit()`/`brandKitFromDeck()`，`brandKitSchema`（hex color 格式、logo 限 https:// 或站內路徑）；`PATCH /api/decks/[id]` 的 `brand` 欄位僅 owner/Admin 可寫入；`components/BrandKitManager.tsx` 編輯 UI，`SlideView.tsx` 以 CSS 變數（`--deck-brand-primary/accent/font`）套用主色／字體並疊加 Logo／頁尾，涵蓋編輯預覽、`/d/[id]`、`/s/[token]`、PDF 匯出頁。(3) FR-AUDIT 擴充：`ViewLog.shareLinkId` 關聯 `ShareLink`；`/api/decks/[id]/view` 接受 `shareToken`，驗證有效性與分享密碼後可用分享連結身分繞過簡報本身的 PRIVATE/AUTHENTICATED/密碼檢查（與 `/s/[token]` 既有的內容存取邏輯一致，修正先前分享連結瀏覽該類簡報時 view log 會被拒絕、成效無法被記錄的問題）；`lib/share-analytics.ts` `getShareLinkAnalytics()` 計算 viewCount／uniqueVisitors／completionRate／dropOffSlide，`ShareLinkManager.tsx` 與 `/decks/[id]/logs` 新增分享連結成效區塊，既有瀏覽紀錄表新增「分享」欄位標示來源連結。 |
| 2.0.1 | 2026-07-04 | 修正播放器進場動畫兩段式重播：`components/SlideView.tsx` 的 Markdown 內容於 client 端 `useEffect` 非同步渲染（首次 commit `html` 為空），原本外框 `.slide-surface` 在內容尚空時即掛上 `slide-animate`，導致 `sFade`（外框）先播、`sRise`（內容）於下一個 frame 才播，視覺上像動畫重複。改為僅在 `html` 就緒後才套用 `slide-animate`（`animate && html`），讓外框與內容一次同步進場；`image` 型投影片於掛載即就緒，維持立即動畫。純前端渲染時序修正，不涉資料表／API／schema。 |
| 2.0.0 | 2026-07-04 | 協作／分享／探索／版本歷史／匯出重大擴充，新增 7 張資料表（`DeckRevision`、`ShareLink`、`DeckCollaborator`、`SlideComment`、`Tag`、`DeckTag`、`Favorite`）與 `Deck.category` 欄位（migration `20260704000000_deck_revisions`、`20260704010000_sharing_collaboration_discovery`）。(1) FR-REVISION：Markdown 自動存檔前定期建立 `DeckRevision` 快照，`/api/decks/[id]/revisions/**` 提供列表與 `restore`。(2) FR-SHARE-LINK：`ShareLink`（token/label/passwordHash/allowDownload/expiresAt/revokedAt）多連結管理，`/s/[token]` 播放器與 `/s/[token]/pdf`，`/api/share-links/[token]/verify-password`。(3) FR-COLLAB：`DeckCollaborator`（`CollaboratorRole` VIEWER/COMMENTER/EDITOR）+ `SlideComment`（留言／resolve／reopen），`/api/decks/[id]/collaborators/**`、`/api/decks/[id]/comments/**`。(4) FR-DISCOVERY：`Tag`/`DeckTag`/`Deck.category` + `Favorite`，首頁依 keyword／分類／標籤搜尋、`/authors/[id]` 作者頁、`/api/decks/[id]/favorite` 收藏。(5) FR-EXPORT：`/decks/[id]/export/pdf` 列印最佳化匯出（16:9 橫向、`app/export.css`、`PrintButton`）。(6) FR-VIEWER Presenter Mode：`???` 分隔講者備註存入 `Slide.notes`，播放含講稿／下一頁預覽／計時器。(7) FR-MARKDOWN-PLUS：`marked` 渲染整合 Mermaid（strict）、KaTeX、highlight.js，輸出仍經 DOMPurify。(8) FR-EDITOR：`lib/slide-templates.ts` 版型庫。(9) FR-AUDIT：單份簡報成效分析（趨勢／唯一訪客／熱門頁／流失頁／來源）。新增相依 `mermaid`/`katex`/`highlight.js`。 |
| 1.7.1 | 2026-06-21 | 採用 TypeScript 7 原生編譯器：`typescript` devDep `^6.0.3` → `7.0.1-rc`（Go 原生埠，含平台二進位）。因 Next 16 無法驅動原生埠的舊版 JS API（build 的 "Running TypeScript" 步驟會誤判 TS 未安裝而崩潰），`next.config.ts` 設 `typescript.ignoreBuildErrors: true` 跳過 build 內建型別檢查；型別把關改由獨立 `tsc --noEmit` 負責。Dockerfile builder 階段於 `npm run build` 前新增 `RUN npm run typecheck`；`docker-publish.yml` 新增 `verify` job（Node 24、`npm ci` → `npm run typecheck` → `npm test`），`build-and-push` 加 `needs: verify`。typecheck 約 6× 快（~15s → ~2.4s）；`tsc` 原生為靜態 Go 二進位，預期相容 alpine/musl，由 PR 的容器 build 自動驗證。 |
| 1.7.0 | 2026-06-21 | 播放器（`components/Viewer.tsx`）功能擴充：(1) 新增 `viewMode` 狀態（`slide`/`overview`），總覽以縮圖網格（`.overview-grid`）呈現全部投影片、點選跳頁，G 鍵切換。(2) 新增雷射筆：`laserEnabled` 狀態 + `laserRef` 紅色光點隨 `onPointerMove` 以 `translate3d` 跟隨游標，L 鍵開關、Esc 關閉，總覽模式自動停用。(3) 新增「離開簡報」按鈕：`exitViewer()` 先 `document.exitFullscreen()` 再 `router.push(exitHref)`；`app/d/[id]/page.tsx` 依登入狀態傳入 `exitHref`（已登入 `/dashboard`、匿名 `/`）。(4) 鍵盤事件在 input/textarea/select/button 聚焦時略過；翻頁與雷射快捷鍵限 `slide` 模式。(5) `app/viewer.css` 新增總覽網格、雷射光點、active 狀態與 `@media(max-width:700px)` 控制列換行/精簡 RWD 樣式。 |
| 1.6.0 | 2026-06-21 | 新增 `AUTHENTICATED`（限登入觀看）可見性：`prisma/schema.prisma` `Visibility` enum 新增值，migration `20260621010000_authenticated_visibility`（`ALTER TYPE "Visibility" ADD VALUE 'AUTHENTICATED'`，純新增、自動套用）；`lib/schemas.ts` `deckCreateSchema.visibility` enum 納入 `AUTHENTICATED`；`GET /api/decks/[id]` 與 `POST /api/decks/[id]/view` 對 `AUTHENTICATED` 未登入者回 401，`app/d/[id]/page.tsx` SSR 將未登入者導向 `/login?callbackUrl=/d/<id>`；列表查詢（`GET /api/decks`、`app/dashboard/page.tsx`）的非 admin `visibility in` 條件加入 `AUTHENTICATED`。登入回跳：`app/login/page.tsx` 讀取並驗證 `callbackUrl`（須為站內 `/` 開頭、非 `//`），傳入 `components/AuthForm.tsx`（credentials 與 Google 登入皆改用 `callbackUrl`）。`components/DeckManager.tsx` 與 `components/Editor.tsx` 可見性下拉新增「限登入觀看」選項。 |
| 1.5.1 | 2026-06-21 | 容器與相依套件安全強化：Dockerfile runner 階段移除基底映像自帶的 `npm`/`npx`/`corepack`（消除其 bundled 相依的 CVE，含 undici `CVE-2026-12151` HIGH、tar、brace-expansion、ip-address），改以 `node_modules/.bin/prisma migrate deploy` 取代 `npx prisma`；`package.json` overrides 新增 `postcss ^8.5.10`（Next 內鎖 8.4.31 → 8.5.15）與 `@hono/node-server ^1.19.13`（Prisma `@prisma/dev` 傳遞相依 → 1.19.14）清除 app-level CVE。Trivy 容器掃描（CRITICAL/HIGH、ignore-unfixed）回歸乾淨。 |
| 1.5.0 | 2026-06-21 | 成員與帳號管理三項新功能 + 密碼簡報模型重構：(1) 新增 `SiteSetting` 資料表（`prisma/migrations/20260621000000_site_settings`，single-row `id=1`，欄位 `allowPublicRegistration`），`lib/site-settings.ts` 提供 `getSiteSettings()`/`canCreatePublicAccount()`（首位使用者一律放行），新增 `PATCH /api/admin/settings/registration`（admin-only）與 `components/RegistrationSettings.tsx`，Email 註冊 (`/api/auth/register`) 與 `auth.ts` Google `signIn` callback 首次建帳前皆檢查開關。(2) Google 帳號綁定：`lib/google-link.ts` 以 `AUTH_SECRET` 簽發 5 分鐘期效 HMAC token，`POST /api/settings/google-link` 寫入 `google_link_intent` httpOnly cookie，`auth.ts` `signIn` 驗證 token 並要求 Google email 已驗證且與綁定者相符；Google provider 改 `allowDangerousEmailAccountLinking: true` 但以 `email_verified` + link-intent 把關；`lib/google-link.test.ts`。(3) `DELETE /api/admin/users/[id]`：Serializable 交易，禁止刪除自己與最後一位有效 ADMIN，連帶刪除其簡報。(4) `PASSWORD` 可見性退役併入 `PUBLIC` + 選用 `passwordHash`；列表查詢改 `visibility in [PUBLIC, PASSWORD]` 相容舊資料，對外以 `isPasswordProtected` 旗標取代外洩 `passwordHash`，`Editor.tsx` 設定頁移除 PASSWORD 選項並提供密碼新增/更換/移除。(5) Dockerfile Node 22→24。 |
| 1.4.0 | 2026-06-21 | 相依套件全面升級：Next 15→16（Turbopack 預設、移除 `next lint`）、Prisma 6→7（datasource `url` 移至 `prisma.config.ts`、執行期改用 `@prisma/adapter-pg` driver adapter、`lib/db.ts` 改寫、新增 `pg`/`dotenv`、Dockerfile 複製 `prisma.config.ts`）、Zod 3→4、Vitest 2→4、TypeScript 5→6（新增 `types/css.d.ts` 滿足 TS2882 CSS side-effect import）、bcryptjs 2→3（移除 `@types/bcryptjs`，型別已內建）、lucide-react 0→1、next-auth `beta.25→beta.31`（支援 Next 16）、`@auth/core` override `0.37.2→0.41.2`；`@types/node` 維持 `^22` 對齊 Node 22 runtime；`next-auth` 維持 v5 beta（不降級至 v4 latest）。安全稽核由 7 項（含 1 critical、1 high）降至 6 moderate（皆為建置/開發工具的傳遞相依）。 |
| 1.3.1 | 2026-06-21 | 公開藝廊整併至首頁：`app/page.tsx` 由 hero 行銷頁改為公開簡報藝廊（沿用 explore 查詢 `PUBLIC+READY`、搜尋/排序、第一張投影片封面、隨 session 切換 CTA）；`/explore` 改為 `redirect()` 至 `/`（保留 `q`/`sort`）；導覽列「探索」改指向 `/`。 |
| 1.3.0 | 2026-06-20 | 上傳更新既有簡報：工作區卡片「更新」動作；Markdown 重用 `PUT /api/decks/:id/markdown`，PPTX 新增 `POST /api/decks/:id/import/pptx`（重新轉檔取代頁面、`getEditableDeck` 把關、型別需相符、`PROCESSING→READY/FAILED`）。 |
| 1.2.1 | 2026-06-20 | 修正簡報卡片封面：`/dashboard` 與 `/explore` 卡片改以第一張投影片渲染為封面（查詢 `slides take:1`、`SlideView` 填滿 `.deck-cover`、`pointer-events:none`），取代固定圖示。 |
| 1.2.0 | 2026-06-20 | 簡報主題系統：`s-*` 白名單版面類別（DOMPurify 保留 `class`、仍移除 `<style>`/inline CSS/JS，零 XSS）+ 播放器進場動畫（`SlideView` animate、`key={index}` 重觸發、stagger、reduced-motion）；旗艦範例改寫為 SlideForge 原生；開發文件 §6.9。 |
| 1.1.1 | 2026-06-20 | UI 全面重新設計（Editorial SaaS 設計系統：語意化 CSS token、`next/font` 載入 Plus Jakarta Sans + Inter、模組化字級、三階陰影/圓角 scale）；a11y（focus-visible 焦點環、`prefers-reduced-motion`）；Markdown 外部連結 `target=_blank` + `rel=noopener`；開發文件 §10 補上美感/配色邏輯與設計系統。 |
| 1.1.0 | 2026-06-20 | 編輯模式改為 Markdown（`---` 分頁、即時預覽、`slideContentSchema` 改 markdown/image 判別式聯集）；移除畫布元素編輯器；新增上傳匯入（`/api/decks/import/markdown`、`/import/pptx` 經 LibreOffice 轉圖）與 `sourceType`/`status` 欄位；新增公開藝廊 `/explore` 與 `GET /api/decks/public`；放寬守衛允許匿名瀏覽 `PUBLIC`/`UNLISTED`（ViewLog `userId` 可為 null）。 |
| 1.0.1 | 2026-06-20 | 部署強化：Auth.js `trustHost`/`AUTH_URL` 修正反向代理／自訂網域登入；容器啟動自動執行 `prisma migrate deploy`（新增 initial migration 與 `db:deploy`）；CI 雙推 Docker Hub + GHCR、升級 Node 24 runtime；README 補完整。 |
| 1.0.0 | 2026-06-20 | 首次發布：線上投影片建立/編輯/瀏覽、三種角色權限、簡報密碼保護、瀏覽與 IP 稽核、Email+Google 登入、Docker 部署。 |
