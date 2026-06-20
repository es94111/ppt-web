# Changelog 公開撰寫規格

`changelog.json` 是給**一般使用者**看的更新日誌，不是給開發者看的。本規格定義其撰寫規則，`update-docs` 流程的步驟 2 必須完全遵守。

## 原則

- **全文繁體中文。**
- 從**使用者角度**描述「結果」，而非實作細節。主詞通常是「使用者可以…」「系統會自動…」「介面新增…」。
- 不得出現任何內部技術代號、檔名、函式、資料表、API 路徑、分支名、審查工具標記。

## 結構

```json
{
  "currentVersion": "X.Y.Z",
  "releases": [
    {
      "version": "X.Y.Z",
      "date": "YYYY-MM-DD",
      "title": "12–25 字一句話描述本次更新",
      "type": "new | feature | improved | fixed | removed | warning",
      "changes": [
        { "tag": "warning", "text": "升級需注意事項（如有）" },
        { "tag": "new", "text": "新增的功能說明" },
        { "tag": "improved", "text": "改進的功能說明" },
        { "tag": "fixed", "text": "修正的問題說明" }
      ]
    }
  ]
}
```

新版本紀錄一律插入 `releases` 陣列**最前面**，並同步更新 `currentVersion`。

`tag` 可用值：`new`（新增）、`improved`（改進）、`fixed`（修正）、`removed`（移除）、`warning`（升級需注意）。

## 版號判斷

- **大版本**（如 2.0.0）：新增重大模組。
- **小版本**（如 1.1.0）：新增功能或重要改進。
- **修正版**（如 1.0.1）：Bug 修正。

## 技術 → 使用者 翻譯表

撰寫前先寫一份「給工程師看」的內部筆記（用於 commit／PR），再逐條翻譯成「給使用者看」的版本：

| 不可出現 | 範例 | 改寫方向 |
|---|---|---|
| 內部規格代號 | `FR-033`、`T099`、`Round 1 Q5`、`SC-004` | 直接刪掉 |
| 分支／spec 編號 | `008-frontend-routing` | 改成功能名稱 |
| 內部審查標記 | `Copilot Review`、`CodeQL 警告` | 改成「資安修正」「程式碼審查修正」 |
| API 路徑 | `POST /api/decks` | 改成「建立簡報功能」 |
| 檔名／函式／變數 | `auth.ts`、`refreshUi()`、`AUTH_SECRET` | 改成它做的事情 |
| 資料表／欄位 | `view_logs`、`passwordHash` | 改成「瀏覽記錄」「密碼」 |
| 環境變數 | `TRUSTED_PROXY_COUNT` | 改成「代理層級設定」 |
| 程式術語 | `bcrypt.compare`、`debounce`、`presigned URL` | 改成「密碼比對」「自動延後儲存」「安全上傳連結」 |
| 套件版號／CVE | `next 15.1.2 → 15.1.3`、`GHSA-…` | 改成「升級框架」「修補已知漏洞」 |
| Schema migration 細節 | `ALTER TABLE …` | 用 `warning` tag 提醒「升級時自動轉換，建議先備份」 |

允許保留：服務／品牌名（Google、Docker、PostgreSQL…）、通用前端詞（深色模式、響應式、彈窗）、合規標示、有意義的數字（180 天保留、200 元素上限等）。

## 條目撰寫規則

- **標題**：12–25 字，不含規格代號、分支名、Review 標記。多重點用「+」串接。
- **每條 change**：40–120 字一句完整中文，描述「結果」勝於「實作」。
- **條目順序**：`warning` → `new` → `improved` → `fixed` → `removed`。
- **warning 條目**：必須明確說會發生什麼 + 給出具體建議。

## 提交前驗證

```bash
# 1. JSON 格式有效
node -e "require('./changelog.json')"

# 2. 沒有禁用字眼殘留（任一指令有輸出代表還沒清乾淨）
grep -n "FR-[0-9]" changelog.json
grep -n "/api/" changelog.json
grep -nE "[a-z]+\.(js|ts|tsx)" changelog.json
grep -n "Copilot\|CodeQL" changelog.json
```

## 自我檢查清單

- [ ] JSON 格式有效
- [ ] `currentVersion` 與最新版本一致
- [ ] 標題沒有規格代號、分支名、Review 標記
- [ ] 沒有 API 路徑、檔名、函式名、資料表名稱
- [ ] 每條 change 都從使用者角度描述
- [ ] `warning` 條目有清楚的建議動作
- [ ] 全文為繁體中文
