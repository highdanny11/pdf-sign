# FEATURES.md

## 功能狀態總覽

| 功能 | 狀態 | 端點 |
|------|------|------|
| 首頁（HTML 表單） | ✅ 已完成 | `GET /` |
| TraceID 追蹤 | ✅ 已完成 | 全域 middleware，所有路由均適用 |
| Event Log 查詢 | ✅ 已完成 | `GET /event-logs` |
| Event Log 清除 | ✅ 已完成 | `DELETE /event-logs` |
| PDF 解析（文字擷取） | 🔲 計畫中 | `POST /pdf/parse`（建議） |
| PDF 簽章嵌入 | 🔲 計畫中 | `POST /pdf/sign`（建議） |
| PDF 翻譯 | 🔲 計畫中 | `POST /pdf/translate`（建議） |
| API 文件（Swagger UI） | 🔲 計畫中 | `GET /docs`（建議） |
| 請求驗證（Zod） | 🔲 計畫中 | 各路由 |

---

## ✅ 首頁（HTML 表單）

**端點：** `GET /`
**實作位置：** `src/controllers/page.controller.ts` → `showIndex()`

**行為描述：**

伺服器以 `fs.readFileSync` 讀取 `./src/views/upload.html` 後以 `text/html` 回傳。頁面包含一個檔案選擇表單（`action="/file"`），目前 `/file` 端點尚未實作，為後續 PDF 功能的預留入口。

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

**依賴套件：** `pdf-parse`（已安裝）

**預期行為：** 接收上傳的 PDF buffer，呼叫 `pdf-parse` 擷取純文字內容並以 JSON 回傳。

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

---

## 🔲 請求驗證（計畫中）

**依賴套件：** `zod`（已安裝）

**預期行為：** 在各路由 handler 內使用 Zod schema 驗證 request body 與 query params，統一回傳驗證錯誤格式。
