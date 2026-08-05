# SlideForge

![version](https://img.shields.io/badge/version-2.6.1-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-blue)

線上投影片建立、瀏覽與權限管理平台。使用者可在網頁上原生建立／編輯投影片並逐頁瀏覽，具備角色權限、簡報密碼保護，以及含 IP 位址的完整瀏覽稽核。

依據 [`docs/開發文件.md`](docs/開發文件.md) 實作。更新日誌見 [`changelog.json`](changelog.json)，需求規格見 [`SRS.md`](SRS.md)。

---

## 目錄

- [功能特色](#功能特色)
- [技術棧](#技術棧)
- [角色與權限](#角色與權限)
- [專案結構](#專案結構)
- [本機開發](#本機開發)
- [環境變數](#環境變數)
- [身分驗證](#身分驗證)
- [圖片儲存（S3）](#圖片儲存s3)
- [可用指令](#可用指令)
- [Docker 部署](#docker-部署)
- [CI/CD](#cicd)
- [安全性](#安全性)
- [頁面與 API](#頁面與-api)
- [授權條款](#授權條款)

---

## 功能特色

- **線上瀏覽**：逐頁播放簡報，支援上一頁／下一頁、鍵盤左右鍵、頁碼指示與全螢幕。
- **Markdown 編輯**：在瀏覽器內用 Markdown 撰寫投影片，左側輸入、右側即時預覽，以單獨一行的 `---` 分頁。
- **AI 簡報助理**：在編輯器輸入主題或貼上長文，即可產生 Markdown 投影片草稿；若未設定外部模型，系統仍會提供本機結構化草稿。
- **AI 改寫、濃縮與語氣調整**：可針對選取文字或整份簡報一鍵改寫、縮短，或調整成指定聽眾與語氣。
- **AI 講者備註產生**：可根據每頁內容自動補上 `???` 講稿，並沿用 Presenter Mode 顯示。
- **講者備註 + Presenter Mode**：每頁可用獨立一行的 `???` 撰寫講者備註；播放時可開啟講者模式，查看講稿、下一頁預覽、計時器與目前頁數。
- **品牌套件 / 主題管理**：擁有者可設定品牌名稱、Logo、主色、強調色、字體與頁尾，編輯預覽、播放與 PDF 匯出會一致套用。
- **範本/版型庫**：編輯器內建封面、議程、數據、雙欄比較、課程章節、結尾行動等常用版型，可直接插入 Markdown。
- **版本歷史 / 還原**：自動儲存前會定期保留 Markdown 快照，編輯器可查看最近版本並一鍵還原。
- **Markdown 增強**：支援 Mermaid 圖表、KaTeX 數學式與程式碼高亮，適合技術提案、課程與研究簡報。
- **精美主題 + 動畫**：用一組安全的版面標籤（`s-*`）做出深色/淺色主題、漸層標題、數據卡、多欄等旗艦級版面；播放時投影片淡入、內容逐項浮現（尊重 reduced-motion）。撰寫說明與範例見 [`docs/examples/`](docs/examples/)。
- **上傳匯入**：上傳 `.md` Markdown 檔即可匯入成可編輯簡報；也支援上傳 `.pptx`，系統會自動解析投影片內容（標題、條列、表格、講者備註）轉為可編輯 Markdown。
- **PDF 匯出**：擁有者/Admin 可開啟列印最佳化的 PDF 匯出頁，將每張投影片以 16:9 橫向頁面另存為 PDF。
- **公開藝廊（首頁）**：首頁 `/` 即公開簡報藝廊，可瀏覽全站公開簡報，支援關鍵字搜尋與最新／最熱門排序（舊路徑 `/explore` 自動轉址至首頁）。
- **標籤、分類、作者頁與收藏**：公開藝廊可依標籤/分類篩選，作者頁彙整個人公開簡報，登入者可收藏公開簡報。
- **分享連結管理 + 成效分析**：每份簡報可建立多組分享連結，設定到期時間、分享密碼、是否允許 PDF 下載，並可隨時撤銷；每組連結會顯示觀看次數、唯一訪客、完成率與流失頁。
- **協作者與留言審閱**：擁有者/Admin 可加入 viewer/commenter/editor 協作者；投影片支援留言、解決與重開狀態。
- **匿名瀏覽**：公開簡報與首頁公開藝廊**未登入即可觀看**；私人與密碼簡報仍需登入或密碼。
- **三種角色**：管理員（Admin）、使用者（User）、訪客（Guest）。首位以 Email 註冊者自動成為 Admin。
- **角色管理**：Admin 可在後台指派任意帳號為 User／Guest／Admin，並啟用或停用帳號。
- **簡報密碼保護**：每份簡報可設定獨立瀏覽密碼，並支援私人／需密碼／公開／不公開列出等可見性。
- **瀏覽稽核 + 成效分析**：記錄誰、在何時、從哪個 IP 位址、瀏覽了哪份簡報的第幾頁（匿名瀏覽記為訪客 + IP）。Admin 可查看全站、User 可查看自己簡報的記錄；單份簡報提供趨勢、唯一訪客、熱門投影片、流失頁與來源統計。
- **雙重登入**：Email + 密碼，或 Google OAuth。
- **資安內建**：密碼雜湊、後端強制授權、輸入驗證、Markdown 輸出消毒（DOMPurify）、速率限制（詳見 [安全性](#安全性)）。

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 16（App Router、Turbopack）、React 19 |
| 語言 | TypeScript |
| 資料庫 | PostgreSQL + Prisma ORM 7（`@prisma/adapter-pg` driver adapter） |
| 認證 | Auth.js（NextAuth v5）— Credentials + Google |
| 圖片儲存 | S3 相容物件儲存（presigned upload） |
| 測試 | Vitest |
| 部署 | Docker（standalone 輸出） |
| CI/CD | GitHub Actions → Docker Hub + GHCR |

## 角色與權限

| 操作 | Admin | User | Guest |
|------|:-----:|:----:|:-----:|
| 瀏覽授權／公開簡報 | ✅ | ✅ | ✅ |
| 建立簡報 | ✅ | ✅ | ❌ |
| 編輯／刪除自己的簡報 | ✅ | ✅ | ❌ |
| 編輯／刪除他人的簡報 | ✅ | ❌ | ❌ |
| 設定簡報密碼 | ✅ | ✅（自己的） | ❌ |
| 管理使用者角色 | ✅ | ❌ | ❌ |
| 查看全站瀏覽稽核 | ✅ | 自己簡報 | ❌ |

> 新註冊帳號預設為 `GUEST`，需由 Admin 升級（最小權限原則）。所有權限皆於後端 API 強制驗證，前端隱藏僅為體驗。

## 專案結構

```
ppt-web/
├─ app/                    # Next.js App Router 頁面與 API
│  ├─ api/                 # REST 端點（auth / decks / slides / admin / uploads）
│  ├─ admin/              # 使用者管理、全站稽核
│  ├─ decks/[id]/edit/    # 投影片編輯器
│  ├─ d/[id]/             # 瀏覽播放器
│  ├─ dashboard/          # 我的簡報
│  ├─ login / register / settings
│  └─ layout.tsx, page.tsx
├─ components/             # React 元件（Editor / Viewer / DeckManager …）
├─ lib/                    # db、schemas（Zod）、security、rate-limit、http
├─ prisma/schema.prisma    # 資料模型
├─ auth.ts                 # Auth.js 設定
├─ Dockerfile             # 多階段建置（非 root 執行）
├─ .github/workflows/docker-publish.yml   # CI：build + push
└─ docs/開發文件.md         # 完整設計文件
```

## 本機開發

**前置需求**：Node.js 20+（建議 22）、PostgreSQL 14+、npm。

```bash
# 1. 取得環境變數範本並填寫
cp .env.example .env
#    至少設定 DATABASE_URL 與 32 字元以上的 AUTH_SECRET

# 2. 安裝依賴
npm install

# 3. 建立資料表
npm run db:push          # 或 npm run db:migrate（建立 migration）

# 4. 啟動開發伺服器
npm run dev              # http://localhost:3000
```

第一位以 Email 註冊的帳號會自動成為 `ADMIN`，後續帳號預設為 `GUEST`。

## 環境變數

| 變數 | 必填 | 說明 |
|------|:----:|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `AUTH_SECRET` | ✅ | Session 加密金鑰，至少 32 字元（`openssl rand -base64 32`） |
| `AUTH_URL` | 正式環境 ✅ | 對外完整網址，例如 `https://ppt.shao.one` |
| `AUTH_TRUST_HOST` | 正式環境 ✅ | 反向代理部署設為 `true` |
| `TRUSTED_PROXY_COUNT` | ✅ | 反向代理層數，用於正確解析來源 IP（本機 `0`，單層代理 `1`） |
| `AUTH_GOOGLE_ID` | — | Google OAuth Client ID（設定後自動啟用 Google 登入） |
| `AUTH_GOOGLE_SECRET` | — | Google OAuth Client Secret |
| `S3_ENDPOINT` | — | S3 相容端點（啟用圖片上傳） |
| `S3_REGION` | — | 區域（預設 `auto`） |
| `S3_BUCKET` | — | Bucket 名稱 |
| `S3_ACCESS_KEY` | — | 存取金鑰 |
| `S3_SECRET_KEY` | — | 私密金鑰 |
| `S3_PUBLIC_URL` | — | 圖片對外存取的基底 URL |
| `AI_API_KEY` | — | AI 簡報助理使用的 OpenAI-compatible API key；未設定時改用本機 fallback |
| `AI_MODEL` | — | AI 簡報助理模型名稱；與 `AI_API_KEY` 同時設定才會呼叫外部模型 |
| `AI_API_BASE_URL` | — | OpenAI-compatible chat completions base URL，預設 `https://api.openai.com/v1` |

## 身分驗證

- **Email + 密碼**：內建註冊／登入；密碼以 bcrypt 雜湊，登入與密碼驗證皆有速率限制。
- **Google OAuth**（選配）：設定 `AUTH_GOOGLE_ID` 與 `AUTH_GOOGLE_SECRET` 後自動啟用。OAuth 回呼網址設為 `<站台網址>/api/auth/callback/google`。

Zeabur 自訂網域部署必須設定：

```env
AUTH_URL=https://ppt.shao.one
AUTH_TRUST_HOST=true
```

Google OAuth 的 Authorized redirect URI 則設為 `https://ppt.shao.one/api/auth/callback/google`。

## 圖片儲存（S3）

投影片圖片可直接使用 HTTPS URL，或設定上方 `S3_*` 變數啟用 S3 相容物件儲存（MinIO／Cloudflare R2 等）的 presigned 直傳。

> Bucket 需設定 CORS 規則，允許應用網域對其執行 `PUT`。

## 可用指令

| 指令 | 用途 |
|------|------|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 正式建置（先 `prisma generate` 再 `next build`，standalone 輸出） |
| `npm start` | 啟動正式建置 |
| `npm run lint` | 提示訊息（Next 16 已移除 `next lint`；如需 lint 請自行加上 ESLint flat config） |
| `npm run typecheck` | 型別檢查 |
| `npm test` | Vitest 測試 |
| `npm run db:push` | 將 schema 套用到資料庫 |
| `npm run db:migrate` | 建立並套用 migration |
| `npm run db:deploy` | 正式環境套用已提交的 migration |

## Docker 部署

### 直接拉取已發布 image

```bash
# Docker Hub
docker pull <DOCKERHUB_USERNAME>/ppt-web:latest

# 或 GHCR
docker pull ghcr.io/es94111/ppt-web:latest
```

### 本機建置與執行

```bash
docker build -t ppt-web .

docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/ppt_web" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e TRUSTED_PROXY_COUNT="1" \
  ppt-web
```

- image 採 `output: "standalone"`，啟動指令為 `node server.js`，並以非 root 使用者執行。
- Docker 容器啟動時會先執行 `prisma migrate deploy`，成功後才啟動 Web 服務。
- 正式環境建議於前方以反向代理（Nginx／Caddy／Traefik）終止 TLS，並正確帶入 `X-Forwarded-For` 以利 IP 稽核。
- 完整的 docker-compose（web + PostgreSQL + MinIO）範例見 [`docs/開發文件.md` §13](docs/開發文件.md)。

## CI/CD

`.github/workflows/docker-publish.yml`：push 到 `main` 或推送 `v*.*.*` tag 時，自動建置 Docker image 並**同時推送至 Docker Hub 與 GHCR**。

- 分支推送產生 `latest`、`main`、`sha-<commit>` 等 image tag。
- 版本 tag（如 `v1.0.0`）額外產生 `1.0.0`、`1.0` 語意化 tag。
- 需要的 repo secrets：`DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`（Docker Hub Access Token）；GHCR 使用內建 `GITHUB_TOKEN`。

## 安全性

- 密碼（使用者與簡報）一律雜湊儲存，不存明文。
- 所有權限於後端 API 強制驗證，並防範 IDOR。
- 輸入以 Zod 驗證，輸出消毒以防 XSS；資料存取透過 Prisma 參數化查詢以防注入。
- 登入、註冊、簡報密碼驗證皆套用速率限制。
- 透過 `TRUSTED_PROXY_COUNT` 正確解析來源 IP，避免偽造。

## 頁面與 API

| 路徑 | 說明 |
|------|------|
| `/` | 首頁（公開簡報藝廊，含搜尋／排序） |
| `/login` `/register` | 登入註冊 |
| `/dashboard` | 我的簡報（建立／管理） |
| `/decks/[id]/edit` | 投影片編輯器 |
| `/decks/[id]/export/pdf` | 列印最佳化 PDF 匯出 |
| `/decks/[id]/logs` | 單份簡報瀏覽成效分析 |
| `/d/[id]` | 瀏覽播放器 |
| `/s/[token]` | 分享連結播放器 |
| `/authors/[id]` | 作者公開簡報頁 |
| `/admin/users` `/admin/logs` | 使用者管理、全站稽核 |
| `/api/decks/**` | 簡報與投影片 CRUD、密碼驗證、瀏覽記錄 |
| `/api/decks/[id]/ai` | AI 起稿、改寫、濃縮、語氣調整與講者備註 |
| `/api/decks/[id]/revisions/**` | Markdown 版本歷史與還原 |
| `/api/decks/[id]/share-links/**` | 分享連結建立、列表、撤銷 |
| `/api/decks/[id]/collaborators/**` | 協作者管理 |
| `/api/decks/[id]/comments/**` | 投影片留言與解決狀態 |
| `/api/decks/[id]/favorite` | 收藏/取消收藏 |
| `/api/admin/**` | 角色／狀態管理、稽核查詢 |
| `/api/uploads/image` | 圖片 presigned upload |

完整 API 與權限對照見 [`docs/開發文件.md` §7](docs/開發文件.md)。

## 授權條款

尚未指定授權條款。如需開放使用，建議於專案根目錄新增 `LICENSE` 檔（例如 MIT），並在 `package.json` 補上 `license` 欄位。
