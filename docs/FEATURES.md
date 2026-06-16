# FEATURES.md

## 功能狀態總覽

| 功能 | 狀態 | 端點 |
|------|------|------|
| 首頁（PDF 上傳與轉換 UI） | ✅ 已完成 | `GET /` |
| TraceID 追蹤 | ✅ 已完成 | 全域 middleware，所有路由均適用 |
| Event Log 查詢 | ✅ 已完成 | `GET /event-logs` |
| Event Log 清除 | ✅ 已完成 | `DELETE /event-logs` |
| PDF 轉 HTML | ✅ 已完成 | `POST /pdf/to-html` |
| PDF 轉 Markdown | ✅ 已完成 | `POST /pdf/to-markdown` |
| Docker 容器化 | ✅ 已完成 | — |
| PDF 解析（文字擷取） | 🔲 計畫中 | `POST /pdf/parse`（建議） |
| PDF 簽章嵌入 | 🔲 計畫中 | `POST /pdf/sign`（建議） |
| PDF 翻譯 | 🔲 計畫中 | `POST /pdf/translate`（建議） |
| API 文件（Swagger UI） | 🔲 計畫中 | `GET /docs`（建議） |

---

## ✅ 首頁（HTML 表單）

**端點：** `GET /`
**實作位置：** `src/controllers/page.controller.ts` → `showIndex()`

**行為描述：**

伺服器以 `fs.readFileSync` 讀取 `./src/views/upload.html` 後以 `text/html` 回傳。頁面提供完整的 PDF 上傳與轉換介面：選擇 PDF 檔案後，透過 JavaScript `fetch` 呼叫 `POST /pdf/to-html`，成功後以 `<iframe>` 即時預覽轉換結果，並提供「下載 HTML」按鈕，下載的檔名自動將 `.pdf` 副檔名替換為 `.html`。

**查詢參數：** 無

**請求 body：** 無

**回應：**
- `200 OK`，`Content-Type: text/html`，回傳 `src/views/upload.html` 的完整內容
- `500 Internal Server Error`，`text/plain: Internal Server Error`（view 檔案不存在時觸發 ENOENT，由 try/catch 捕捉後設定 `c.set('error', ...)` 並回傳）

**注意：** 所有回應均含 `X-Trace-Id` header（由全域 TraceID middleware 注入）。

---

## ✅ TraceID 追蹤

**實作位置：** `src/middleware/traceId.middleware.ts` → `traceIdMiddleware`
**掛載方式：** `app.use('*', traceIdMiddleware)`（全域，在 `src/app.ts` 中定義）

**行為描述：**

每個 API 請求進入後，middleware 自動執行以下流程：

1. 以 `crypto.randomUUID()` 產生 UUID v4 格式的 `traceId`（Node.js 15+ 內建，無需額外套件）
2. 將 `traceId` 存入 Hono context：`c.set('traceId', traceId)`，可在後續 controller 中取用
3. 記錄請求開始時間
4. 呼叫 `await next()` 讓 controller 執行
5. controller 執行完畢後，計算耗時（`Date.now() - start`）
6. 呼叫 `writeEventLog()` 將本次請求的 method、path、status、duration、error 寫入當天的 log 檔
7. 以 `c.header('X-Trace-Id', traceId)` 將 traceId 寫入 response header 回傳給呼叫方

若 controller 在 catch 區塊中呼叫了 `c.set('error', String(err))`，middleware 會將該錯誤訊息一併記入 log（`error` 欄位）。

**回應 Header：**
- `X-Trace-Id: <uuid-v4>` — 附於所有 API 回應

---

## ✅ Event Log 查詢

**端點：** `GET /event-logs`
**實作位置：** `src/controllers/eventLog.controller.ts` → `getEventLogs()`
**Model：** `src/models/eventLog.model.ts` → `readEventLogs()`

**行為描述：**

讀取 `./logs/` 目錄下所有 `event-*.log` 檔案（按檔名字母排序，即按日期排序），將每行 JSON 解析後合併為陣列回傳。

**查詢參數：**
- `traceId`（選填）：若帶入，僅回傳 `traceId` 欄位符合的 log 條目

**回應：**
- `200 OK`，`Content-Type: application/json`，回傳 `EventLogEntry[]`

**Log 條目結構：**

```json
{
  "traceId": "a1b2c3d4-...",
  "timestamp": "2026-06-14T10:00:00.000Z",
  "method": "GET",
  "path": "/",
  "status": 200,
  "duration": 12,
  "error": undefined
}
```

**範例請求：**
```bash
# 查詢所有 log
GET /event-logs

# 依 traceId 過濾
GET /event-logs?traceId=a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## ✅ Event Log 清除

**端點：** `DELETE /event-logs`
**實作位置：** `src/controllers/eventLog.controller.ts` → `deleteEventLogs()`
**Model：** `src/models/eventLog.model.ts` → `resetEventLog()`

**行為描述：**

刪除 `./logs/` 目錄下所有 `event-*.log` 檔案（含輪替產生的 `-v1`、`-v2` 版本），並回傳刪除的總筆數。此操作**不可逆**，執行後所有歷史 log 均會消失。

**查詢參數：** 無

**回應：**
- `200 OK`，`Content-Type: application/json`

```json
{ "deleted": 42 }
```

---

## ✅ PDF 轉 HTML

**端點：** `POST /pdf/to-html`
**實作位置：** `src/controllers/pdf.controller.ts` → `pdfToHtml()`
**工具函式：** `src/utils/pdfToHtml.ts` → `pdfBufferToHtml()`

**行為描述：**

接收 multipart/form-data 上傳的 PDF 檔案，透過容器內的 `pdf2htmlEX` 二進位程式將其轉換為完全自含（self-contained）的 HTML 字串後回傳。「完全自含」意指 CSS、字型（woff）、圖片均以 Base64 或 inline 方式嵌入，呼叫方取得 HTML 後可直接儲存、預覽，無需額外靜態資源。

轉換流程：
1. 以 Zod 驗證上傳欄位（型別、副檔名、大小）
2. 將 `File.arrayBuffer()` 轉為 `Buffer` 寫入 `/tmp/pdf-convert-<uuid>/input.pdf`（臨時目錄）
3. 呼叫 `pdftohtmljs`（底層為 `pdf2htmlEX`），帶入 `--embed-css 1 --embed-font 1 --embed-image 1 --embed-javascript 1 --dest-dir <tempDir>` 旗標
4. 讀取輸出的 `output.html`
5. 在 `finally` 中刪除整個臨時目錄
6. 回傳 `{ html: "..." }`

**上傳欄位：**
- `file`（必填）：PDF 檔案，`multipart/form-data` 格式，欄位名稱固定為 `file`

**驗證規則（Zod）：**
- `file` 欄位必須存在且為 `File` 型別
- `file.type === 'application/pdf'` 或 `file.name` 以 `.pdf` 結尾（防止 MIME 偽造）
- `file.size > 0`（不得為空檔）
- `file.size <= 50 MB`

**回應：**
- `200 OK`，`Content-Type: application/json`
  ```json
  { "html": "<!DOCTYPE html>..." }
  ```
- `400 Bad Request`，驗證失敗時回傳第一個錯誤訊息：
  ```json
  { "error": "File must be a PDF" }
  ```
- `500 Internal Server Error`，轉換過程中發生例外（例如 `pdf2htmlEX` 未安裝、PDF 損毀）：
  ```json
  { "error": "PDF conversion failed" }
  ```

**環境需求：** `pdf2htmlEX` 二進位必須可在執行環境 PATH 中找到。使用 Docker（`docker compose up`）時已由基礎映像 `pdf2htmlex/pdf2htmlex` 提供，無需額外安裝。

---

## ✅ PDF 轉 Markdown

**端點：** `POST /pdf/to-markdown`
**實作位置：** `src/controllers/pdf.controller.ts` → `pdfToMarkdown()`
**工具函式：** `src/utils/pdfToMarkdown.ts` → `pdfBufferToMarkdown()`

**行為描述：**

接收 multipart/form-data 上傳的 PDF 檔案，使用 `pdf-parse`（底層為 PDF.js）擷取各頁文字與文件 metadata，格式化為標準 Markdown 後回傳。不依賴 `pdf2htmlEX` 二進位，可在任何 Node.js 環境中執行（含本機開發，無需 Docker）。

輸出格式為：YAML front matter（含 `title`、`author`、`pages`）+ 各頁以 `---` 分隔的正文，每頁以 `## Page N` 為標題。

轉換流程：
1. 以 Zod 驗證上傳欄位（型別、副檔名、大小），與 `POST /pdf/to-html` 使用相同的 `UploadSchema`
2. 將 `File.arrayBuffer()` 轉為 `Buffer`
3. 建立 `PDFParse` 實例，以 `Promise.all` 並行呼叫 `getText()` 和 `getInfo()`
4. 從 `InfoResult.info` 取出 `Title`、`Author`（若 PDF 未嵌入 metadata 則略過對應欄位）
5. 將各頁 `PageTextResult` 格式化為 `## Page N\n\n<文字>` 區塊並以 `---` 串接
6. 在 `finally` 中呼叫 `parser.destroy()` 釋放資源
7. 回傳 `{ markdown: "...", metadata: { pages, title?, author? } }`

**上傳欄位：**
- `file`（必填）：PDF 檔案，`multipart/form-data` 格式，欄位名稱固定為 `file`

**驗證規則（Zod）：**
- `file` 欄位必須存在且為 `File` 型別
- `file.type === 'application/pdf'` 或 `file.name` 以 `.pdf` 結尾
- `file.size > 0`（不得為空檔）
- `file.size <= 50 MB`

**回應：**
- `200 OK`，`Content-Type: application/json`
  ```json
  {
    "markdown": "---\ntitle: \"My Document\"\nauthor: \"John\"\npages: 3\n---\n\n## Page 1\n\n...\n\n---\n\n## Page 2\n\n...",
    "metadata": { "pages": 3, "title": "My Document", "author": "John" }
  }
  ```
- `400 Bad Request`，驗證失敗時回傳第一個錯誤訊息：
  ```json
  { "error": "File must be a PDF" }
  ```
- `500 Internal Server Error`，轉換過程中發生例外（例如 PDF 損毀、加密保護）：
  ```json
  { "error": "PDF conversion failed" }
  ```

**環境需求：** 純 Node.js，不需要外部二進位程式。本機開發（`bun run dev`）即可使用，無需 Docker。

---

## ✅ Docker 容器化

**實作位置：** `Dockerfile`、`docker-compose.yml`、`.dockerignore`

**行為描述：**

整個應用程式以 Docker 形式封裝，基礎映像採用 `pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64`（Ubuntu 20.04，內含 `pdf2htmlEX` 二進位），並從 `oven/bun:1` 映像複製 Bun 執行檔，使容器同時具備 PDF 轉換與 Node.js 應用程式執行能力。

**啟動方式：**

```bash
docker compose build   # 首次或 Dockerfile 變更後執行
docker compose up      # 啟動，伺服器監聽 localhost:3000
```

**Volume 掛載（開發模式）：**
- `./src:/app/src`：本機原始碼同步至容器，搭配 `bun run src/index.ts`（tsx watch）支援熱重載
- `./logs:/app/logs`：Event log 持久化至本機，容器重啟後不遺失

---

## Event Log 檔案管理機制

Log 檔案由 `src/models/eventLog.model.ts` 統一管理，採以下策略避免磁碟耗盡：

| 規則 | 說明 |
|------|------|
| 按天分檔 | 每天一個 `logs/event-YYYY-MM-DD.log`，所有請求追加至當天檔案 |
| 當天超 10MB | 封存為 `event-YYYY-MM-DD-v1.log`，繼續以同名開始新檔；再次超過則產生 `-v2`、`-v3`…，所有版本保留 |
| 自動清除舊檔 | 每次寫入 log 時，刪除修改時間超過 7 天的所有 `event-*.log`（含版本檔） |

---

## 🔲 PDF 解析（計畫中）

**預計端點：** `POST /pdf/parse`

**依賴套件：** `pdf-parse`（已安裝，目前由 `POST /pdf/to-markdown` 使用）

**預期行為：** 接收上傳的 PDF buffer，以更結構化的方式回傳純文字內容（含頁碼、字元數統計等中繼資料），供需要原始文字的下游處理使用（如翻譯、搜尋索引）。

---

## 🔲 PDF 簽章嵌入（計畫中）

**預計端點：** `POST /pdf/sign`

**依賴套件：** `pdf-lib`、`@pdf-lib/fontkit`（均已安裝）

**預期行為：** 接收 PDF buffer 與簽章選項（位置、文字或圖片），使用 `pdf-lib` 在指定位置嵌入簽章後回傳簽署後的 PDF。

---

## 🔲 PDF 翻譯（計畫中）

**預計端點：** `POST /pdf/translate`

**依賴套件：** `pdf-parse`（擷取文字）、`deepl-node`（翻譯）、`pdf-lib`（寫回文字）

**環境變數依賴：** `DEEPL_API_KEY`

**預期行為：** 解析 PDF 文字 → 呼叫 DeepL API 翻譯 → 生成翻譯後的 PDF 或純文字回傳。

---

## 🔲 API 文件（計畫中）

**預計端點：** `GET /docs`

**依賴套件：** `swagger-jsdoc`（已安裝）

**預期行為：** 自動從各路由 JSDoc `@openapi` 標注生成 OpenAPI 3.0 規格，並渲染 Swagger UI。

