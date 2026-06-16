# CHANGELOG.md

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式。

---

## [Unreleased]

### 新增
- **`POST /pdf/to-markdown`**：接收 PDF 上傳，使用 `pdf-parse`（PDF.js）擷取各頁文字及 metadata，格式化為含 YAML front matter（title、author、pages）與頁碼分隔的 Markdown，以 `{ markdown: "...", metadata: { pages, title?, author? } }` 格式回傳；不依賴 `pdf2htmlEX`，本機環境即可使用
- **`POST /pdf/to-html`**：接收 PDF 上傳，透過 `pdf2htmlEX` 轉換為完全自含 HTML（CSS、字型、圖片均 inline），以 `{ html: "..." }` JSON 格式回傳
- **Zod 請求驗證**：`POST /pdf/to-html` 使用 Zod 驗證上傳欄位（MIME 型別、副檔名、大小上限 50 MB）
- **Docker 容器化**：新增 `Dockerfile`（基於 `pdf2htmlex/pdf2htmlex` Ubuntu 20.04 + `oven/bun:1`）、`docker-compose.yml`、`.dockerignore`
- **PDF 上傳 UI**（`src/views/upload.html`）：改版為完整的 PDF 轉換介面，含上傳、轉換進度提示、`<iframe>` 即時預覽、HTML 下載（檔名自動由 `.pdf` 改為 `.html`）
- **`src/types/pdftohtmljs.d.ts`**：為 `pdftohtmljs`（CJS 無型別定義）補充 ambient TypeScript 型別宣告
- **EventLog 功能**：每個 API 請求自動產生 `traceId`（UUID v4），寫入 response header `X-Trace-Id`
- **EventLog 儲存**：請求資訊（method、path、status、duration、error）以 JSON Lines 格式持久化至 `logs/event-YYYY-MM-DD.log`
- **EventLog 查詢**：`GET /event-logs`，支援 `?traceId=` 過濾
- **EventLog 清除**：`DELETE /event-logs`，清空所有 log 檔，回傳刪除筆數
- **Log 輪替機制**：當天 log 超過 10MB 自動封存為 `-v1`、`-v2`…，所有版本保留
- **Log 自動清除**：超過 7 天的舊 log 檔於每次寫入時自動刪除

### 變更
- **MVC 架構重構**：原先邏輯集中於 `src/index.ts` → 拆分為 `routes/`、`controllers/`、`models/`、`middleware/`、`views/`、`types/`
- **`src/index.ts`** 精簡為只負責 `serve()`，Hono app 定義移至 `src/app.ts`
- **`GET /`** 讀取路徑由 `src/index.html` 改為 `src/views/upload.html`，並加入 try/catch 錯誤處理
- **`PORT`** 現在從 `process.env.PORT` 讀取（預設 `3000`）
- **`vitest`** 從 `dependencies` 移至 `devDependencies`（修正錯誤分類）
- **`logs/`、`uploads/`** 加入 `.gitignore`

### 移除
- **`POST /file`**：檔案上傳端點已從程式碼移除，需求確認後另行實作
- **`src/index.html`**：已移動至 `src/views/upload.html`

### 計畫中
- PDF 文字解析（pdf-parse）
- PDF 簽章嵌入（pdf-lib + fontkit）
- PDF 翻譯（deepl-node）
- API 文件（swagger-jsdoc + Swagger UI）

---

## [0.1.0] — 2026-06-13

### 新增
- 初始專案建立（Hono.js + TypeScript + Node.js）
- `GET /`：回傳 HTML 檔案上傳表單
- `POST /file`：接收 multipart/form-data，儲存檔案至 `./uploads/`
- TypeScript 設定（ESNext、NodeNext 模組系統、strict 模式）
- 依賴安裝：hono、@hono/node-server、pdf-lib、pdf-parse、deepl-node、swagger-jsdoc、zod、vitest
