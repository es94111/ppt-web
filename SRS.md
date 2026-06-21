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
- **FR-SLIDE**：Slide CRUD、排序；content 為 JSON（text/image/shape 元素），寫入前 Zod 驗證。
- **FR-EDITOR**：Admin/Owner 可進編輯器；自動存檔；圖片走 S3 相容 presigned upload。
- **FR-VIEWER**：唯讀渲染、上一頁/下一頁、鍵盤、全螢幕、頁碼。
- **FR-AUDIT**：ViewLog 記錄 user/deck/slideOrder/ip/ua/time；Admin 全站查詢、User 自助查詢。

## 4. 非功能需求

- **安全**：argon2/bcrypt 雜湊、後端授權、IDOR 防護、Zod 輸入驗證、輸出消毒（XSS）、Prisma 參數化（注入）、CSP/安全標頭、CSRF、檔案上傳白名單、可信代理 IP 解析。
- **隱私**：IP/UA 屬個資，揭露用途與保存期限（預設 180 天），僅 Admin 可存取全站記錄。
- **美觀/可用性**：Tailwind + shadcn/ui、響應式、深色模式、WCAG AA。
- **可移植性**：Docker 容器化（standalone 輸出），可部署至任何支援 Docker 的平台。

## 5. 技術棧

Next.js 15（App Router）/ TypeScript / PostgreSQL / Prisma / Auth.js / Tailwind + shadcn/ui / S3 相容物件儲存 / Docker。

## 6. 資料模型

`User`、`Deck`、`Slide`、`ViewLog` 及 Auth.js 標準表（`Account`/`Session`）。詳見 `prisma/schema.prisma` 與設計文件 §5。

## 7. 部署與 CI/CD

- Docker / docker-compose（web + postgres + minio）。
- 規劃 GitHub Actions：lint/test/gitleaks → build image → Trivy → push（Docker Hub/GHCR）。詳見設計文件 §13。

## 8. 版本

### 8.1 版號規則

語意化版號 `MAJOR.MINOR.PATCH`。使用者導向的更新摘要見 [`changelog.json`](changelog.json)；公開撰寫規格見 [`.specify/memory/changelog-style.md`](.specify/memory/changelog-style.md)。

### 8.2 版本歷程

| 版本 | 日期 | 說明 |
|------|------|------|
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
