# SlideForge

![version](https://img.shields.io/badge/version-1.0.0-blue)

依據 [`docs/開發文件.md`](docs/開發文件.md) 實作的 Next.js 線上投影片平台。更新日誌見 [`changelog.json`](changelog.json)，規格見 [`SRS.md`](SRS.md)。

## 本機啟動

1. 複製 `.env.example` 為 `.env`，設定 PostgreSQL `DATABASE_URL` 與至少 32 字元的 `AUTH_SECRET`。
2. 安裝依賴：`npm install`
3. 建立資料表：`npm run db:push`
4. 啟動：`npm run dev`

第一位以 Email 註冊的帳號會自動成為 `ADMIN`；後續帳號預設為 `GUEST`。

Google OAuth 為選配；設定 `AUTH_GOOGLE_ID` 與 `AUTH_GOOGLE_SECRET` 後會自動啟用 provider。

圖片可使用 HTTPS URL，或設定 `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY` 與 `S3_PUBLIC_URL`，啟用 S3 相容物件儲存的 presigned upload。Bucket 需允許應用網域執行 `PUT` 的 CORS 規則。

## 驗證

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit`

production build 採 standalone 輸出，適合容器部署。
