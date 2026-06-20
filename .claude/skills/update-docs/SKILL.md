---
name: update-docs
description: 完成功能或修正後的發版流程 — 判斷版號、更新 changelog.json / SRS.md / README.md、commit → PR → squash merge 進 main → 在合併 commit 打版本 tag → 建立 GitHub Release。當使用者說「發版」「update-docs」「更新文件與版號」「release」「出版本」時使用。
---

# 更新文件與版號

完成功能開發或修正後，依序執行以下步驟確保所有文件保持同步。

> **撰寫 changelog 條目前必讀**：`.specify/memory/changelog-style.md`（Changelog 公開撰寫規格）。本指令的步驟 2 必須完全遵守該規格。

## 步驟 1：判斷版號

根據異動規模決定版號：
- **大版本**（如 4.0）：新增重大模組
- **小版本**（如 3.8）：新增功能或重要改進
- **修正版**（如 3.7.1）：Bug 修正

讀取 `changelog.json` 的 `currentVersion` 確認目前版號，再決定新版號。

## 步驟 2：更新 `changelog.json`

> **重要**：`changelog.json` 是給**一般使用者**看的，不是給開發者看的。完整規格見 `.specify/memory/changelog-style.md`。

### 2.1 結構

1. 將 `currentVersion` 改為新版號
2. 在 `releases` 陣列**最前面**插入新版本紀錄：

```json
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
```

`tag` 可用值：`new`（新增）、`improved`（改進）、`fixed`（修正）、`removed`（移除）、`warning`（升級需注意）

### 2.2 撰寫前必做：技術 → 使用者翻譯

先寫一份「給工程師看」的內部筆記（含完整技術細節，用於 commit message／PR），再對照下表逐條翻譯成「給使用者看」的版本：

| 不可出現 | 範例 | 改寫方向 |
|---|---|---|
| 內部規格代號 | `FR-033`、`T099`、`Round 1 Q5`、`SC-004`、`CT-1` | 直接刪掉 |
| 分支／spec 編號 | `008-frontend-routing` | 改成功能名稱 |
| 內部審查標記 | `Copilot Review v4.18.2`、`CodeQL 警告` | 改成「資安修正」「程式碼審查修正」 |
| API 路徑 | `POST /api/transactions/import` | 改成「匯入交易功能」 |
| 檔名／函式／變數 | `server.js`、`refreshRecFxUi()`、`SERVER_TIME_OFFSET` | 改成它做的事情 |
| 資料表／欄位 | `system_settings`、`token_version`、`recurring.amount` | 改成「設定值」「登入憑證」「金額」 |
| 環境變數 | `TWSE_MAX_CONCURRENCY`、`MTLS_CF_ONLY` | 改成「並發上限」「Cloudflare 模式」 |
| 程式術語 | `BEGIN/COMMIT/ROLLBACK`、`setImmediate`、`partial unique index`、`bcrypt.compare` | 改成「全部成功或全部回復」「背景執行」「重複保護」 |
| 套件版號／CVE 細節 | `resend 6.1.3 → 6.12.2`、`GHSA-…` | 改成「升級寄信套件」「修補已知漏洞」 |
| Schema migration 細節 | `ALTER TABLE … REAL → INTEGER`、`冪等 ALTER` | 用 `warning` tag 提醒「升級時自動轉換，建議先備份」 |
| 內部演算法名稱 | `三層 fallback`、`atomic delete + insert`、`token bucket` | 改成「自動備援」「原子化更新」 |

允許保留：服務／品牌名（Google、Docker、PostgreSQL、Cloudflare…）、通用前端詞（深色模式、響應式、彈窗）、合規標示、有意義的數字（180 天保留、200 元素上限等）。

### 2.3 條目撰寫規則

- **標題**：12–25 字，不含規格代號、分支名、Review 標記。多重點用「+」串接。
- **每條 change**：40–120 字一句完整中文，從使用者角度寫，主詞通常是「使用者可以…」「系統會自動…」「介面新增…」。描述「結果」勝於「實作」。
- **條目順序**：`warning` →`new` → `improved` → `fixed` → `removed`。
- **warning 條目**：必須明確說會發生什麼 + 給出具體建議。

### 2.4 提交前驗證

逐項執行：

```bash
# 1. JSON 格式有效
node -e "require('./changelog.json')"

# 2. 沒有禁用字眼殘留（任一指令有輸出代表還沒清乾淨）
grep -n "FR-[0-9]" changelog.json
grep -n "/api/" changelog.json
grep -nE "[a-z]+\.(js|ts|tsx)" changelog.json
grep -nE "Copilot|CodeQL" changelog.json
grep -n "Round [0-9]" changelog.json
```

### 2.5 自我檢查清單

- [ ] JSON 格式有效（步驟 2.4 第 1 項通過）
- [ ] `currentVersion` 與最新版本一致
- [ ] 標題沒有規格代號、分支名、Review 標記
- [ ] 沒有 API 路徑、檔名、函式名、資料表名稱
- [ ] 沒有 `FR-XXX`、`T0XX`、`Round X Q Y` 之類的內部代號
- [ ] 每條 change 都從使用者角度描述
- [ ] `warning` 條目有清楚的建議動作
- [ ] 全文為繁體中文

## 步驟 3：更新 `SRS.md`

找到版本歷程表（8.2 節），在表格**最前面**插入一行：

```
| X.Y.Z | YYYY-MM-DD | 簡短說明 |
```

SRS.md 是給開發者看的內部規格，**可以**保留技術術語（API 路徑、資料表名稱等），與 changelog.json 規範不同。

## 步驟 4：更新 `README.md` 與 `package.json`

- 若 README.md 中有版本徽章或變更日誌區塊，同步更新版本號。
- 將 `package.json` 的 `version` 欄位更新為新版號，與 `changelog.json` 一致。

## 步驟 5：提交、合併到 `main`、推送並打版本 Tag

文件與版號更新完成後，將本次變更提交、合併進 `main`、推送到 GitHub，最後在 `main` 上打版本 Tag。

> **本專案規則：`main` 有 branch-protection hook，禁止直接 commit。** 必須先開功能分支。注意 hook 會對整串指令做**靜態掃描**：若同一個指令同時包含 `git checkout -b` 與 `git commit`，仍會因「目前在 main」被擋。因此 **`git checkout -b` 要與 `git add/commit` 分成兩次獨立執行**。

### 5.1 開分支並提交變更

commit message 用 Conventional Commits 格式；**可保留技術細節**（與 changelog.json 的使用者導向規範不同，用途同 PR 說明）。

```bash
# 第一次執行：只切分支
git checkout -b <feature-branch>
```
```bash
# 第二次執行：暫存並提交
git add -A
git commit -m "feat: <一句話描述本次更新> 並更新版號至 X.Y.Z"
```

### 5.2 推送並合併到 `main`（squash merge）

本專案以 **squash merge** 合併 PR，合併後 `main` 會產生一顆**全新的** commit（訊息結尾含 `(#PR編號)`）：

```bash
git push -u origin <feature-branch>
gh pr create --base main --fill
gh pr merge <feature-branch> --squash --delete-branch   # 或於 GitHub 網頁 squash 合併
```

### 5.3 在 `main` 的合併 commit 上打 Tag

> **鐵則：Tag 一定要在 PR 以 squash 合併進 `main` 之後才打，而且要打在 `main` 上那顆合併後的 commit。**

squash merge 會在 `main` 上產生一顆全新 commit，與合併前功能分支上的原始 commit **SHA 不同**。若把 Tag 打在合併前的功能分支 commit、又在合併後刪除該分支，那顆 commit 就不再被任何分支包含，GitHub 會顯示「This commit does not belong to any branch on this repository」。

正確流程（在 `main` 上操作）：

```bash
# 1. 先確認 PR 已 squash 合併進 main，切到 main 並更新到最新
git checkout main && git pull origin main

# 2. 確認 HEAD 就是該 PR 的合併 commit（訊息應含 (#PR編號)）
git log -1 --oneline

# 3. 在 main 的合併 commit 上打 annotated tag
git tag -a vX.Y.Z -m "vX.Y.Z — 一句話描述本次更新"

# 4. 推送 tag
git push origin vX.Y.Z
```

若不慎把 tag 打錯位置（指到合併前的分支 commit），改指到 `main` 上正確的 commit 後強制覆寫遠端 tag：

```bash
git tag -f -a vX.Y.Z <main 上正確的合併 commit> -m "vX.Y.Z — 一句話描述本次更新"
git push origin vX.Y.Z --force
```

> **本專案 CI 行為（重要）**：`.github/workflows/docker-publish.yml` **不會自動建立 git tag**。它只負責 build Docker image 並推送到 **Docker Hub + GHCR**——push 到 `main` 產生 `latest`/`main`/`sha-` image tag；當你**手動推送 `vX.Y.Z` git tag** 時，才會額外 build 出 `X.Y.Z`／`X.Y` 語意化版本的 image。因此步驟 5.3 的手動打 tag **是必要的**，不可省略。

## 步驟 6：建立 GitHub Release

在 `vX.Y.Z` tag 已推上遠端後，以該 tag 建立 GitHub Release。Release Notes **直接取自 `changelog.json` 該版本條目**——它已是使用者導向用語、且已通過步驟 2 的禁用字檢查，無需再翻譯。

### 6.1 由 `changelog.json` 產生標題與 Release Notes

```bash
VERSION="X.Y.Z"
node -e '
  const c=require("./changelog.json");
  const r=(c.releases||[]).find(x=>String(x.version)===process.argv[1]);
  if(!r){console.error("changelog.json 找不到版本 "+process.argv[1]);process.exit(1);}
  const label={warning:"注意",new:"新增",improved:"改進",fixed:"修正",removed:"移除"};
  const order=["warning","new","improved","fixed","removed"];
  const sorted=[...(r.changes||[])].sort((a,b)=>order.indexOf(a.tag)-order.indexOf(b.tag));
  const fs=require("fs");
  fs.writeFileSync(".release-notes.md", sorted.map(ch=>"- **"+(label[ch.tag]||ch.tag)+"**："+ch.text).join("\n")+"\n");
  fs.writeFileSync(".release-title.txt", r.title);
' "$VERSION"
```

### 6.2 建立 Release

```powershell
# 本機環境：gh 不在 PATH，需以 PowerShell + 完整路徑執行（Bash 工具跑不動）
$gh = "C:\Program Files\GitHub CLI\gh.exe"
& $gh release create "vX.Y.Z" `
  --title "vX.Y.Z — $(Get-Content '.release-title.txt' -Raw)" `
  --notes-file ".release-notes.md" `
  --verify-tag --latest
```

- `--verify-tag`：若 `vX.Y.Z` tag 還沒推上遠端，指令會中止——先 `git push origin vX.Y.Z` 後再重試。
- 該版本 Release 已存在時 `create` 會失敗；改用更新：`& $gh release edit "vX.Y.Z" --title "..." --notes-file ".release-notes.md"`。
- 建立完成後刪除暫存檔：`rm -f .release-notes.md .release-title.txt`。

---

完成後回報：「已更新版號至 X.Y.Z，changelog.json（已通過格式與用語檢查）、SRS.md、README.md、package.json 已同步；變更已透過 PR squash 合併進 `main`，已手動在合併 commit 打 tag vX.Y.Z 並推送（CI 隨後 build 版本 image 至 Docker Hub + GHCR），GitHub Release vX.Y.Z 已以 changelog 條目為 Release Notes 建立完成。」
