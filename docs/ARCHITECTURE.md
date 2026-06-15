# ARCHITECTURE.md

## 目錄結構

```
pdf-sign/
├── src/
│   ├── index.ts                    # Server 入口：只負責 serve()，不定義路由
│   ├── app.ts                      # Hono app 建立、middleware 掛載、路由掛載
│   ├── types/
│   │   ├── env.ts                  # Hono AppEnv 型別（context Variables 定義）
│   │   └── pdftohtmljs.d.ts        # pdftohtmljs CJS 套件的 ambient 型別宣告
│   ├── middleware/
│   │   └── traceId.middleware.ts   # 全域 middleware：traceId 生成、計時、event log 寫入
│   ├── models/
│   │   └── eventLog.model.ts       # Event log 寫入、查詢、reset、輪替、舊檔清除
│   ├── controllers/
│   │   ├── page.controller.ts      # GET / 的 HTTP 處理（讀取 view，try/catch）
│   │   ├── eventLog.controller.ts  # GET /event-logs、DELETE /event-logs
│   │   └── pdf.controller.ts       # POST /pdf/to-html（Zod 驗證、呼叫 pdfBufferToHtml）
│   ├── routes/
│   │   ├── page.routes.ts          # 頁面路由（GET /）
│   │   ├── eventLog.routes.ts      # Event log 路由
│   │   └── pdf.routes.ts           # PDF 路由（POST /pdf/to-html）
│   ├── views/
│   │   └── upload.html             # 首頁 HTML：PDF 上傳、轉換、預覽、下載介面
│   └── utils/
│       ├── sanitizeFilename.ts     # 檔名安全處理（path traversal 防護）
│       └── pdfToHtml.ts            # PDF → HTML 轉換工具（呼叫 pdf2htmlEX 並管理臨時檔案）
├── logs/                           # Event log 檔案目錄（runtime 自動建立，不進 Git）
│   └── event-YYYY-MM-DD.log        # 每天一個 JSON Lines 格式 log 檔
├── dist/                           # TypeScript 編譯輸出（bun run build，不進 Git）
├── docs/                           # 專案文件
│   ├── README.md
│   ├── ARCHITECTURE.md（本文件）
│   ├── DEVELOPMENT.md
│   ├── FEATURES.md
│   ├── TESTING.md
│   ├── CHANGELOG.md
│   └── plans/
│       └── archive/
├── Dockerfile                      # 應用程式容器映像（pdf2htmlEX + Bun）
├── docker-compose.yml              # 開發用服務定義（port 3000，src/logs volume）
├── .dockerignore                   # Docker build context 排除清單
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── bun.lock
└── .gitignore
```

### 重要：`src/views/upload.html` 的服務方式

`upload.html` 由 `page.controller.ts` 在每次 `GET /` 請求時以 `fs.readFileSync(path.resolve('./src/views/upload.html'))` 讀取後回傳，並非靜態資源服務。這表示：
- 修改 HTML 後無需重啟伺服器（`tsx watch` 熱重載）
- 路徑解析依賴 CWD 為專案根目錄（`bun run dev` 預設行為）
- 若 view 檔案不存在，controller 的 try/catch 會捕捉 `ENOENT` 並回傳 500

## 啟動流程

**本機開發（不使用 Docker）：**

```
bun run dev
  └─ tsx watch src/index.ts
       └─ import { app } from './app.js'
            └─ import { traceIdMiddleware } from './middleware/traceId.middleware.js'
            └─ import { pageRoutes } from './routes/page.routes.js'
            └─ import { eventLogRoutes } from './routes/eventLog.routes.js'
            └─ import { pdfRoutes } from './routes/pdf.routes.js'
            └─ new Hono<AppEnv>()
            └─ app.use('*', traceIdMiddleware)   ←─ 全域 middleware
            └─ app.route('/', pageRoutes)         ←─ GET /
            └─ app.route('/', eventLogRoutes)     ←─ GET /event-logs, DELETE /event-logs
            └─ app.route('/', pdfRoutes)          ←─ POST /pdf/to-html
       └─ serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 })
            └─ Node.js HTTP server 監聽 :PORT（預設 3000）
```

**Docker 啟動（建議，含 pdf2htmlEX）：**

```
docker compose up
  └─ 以 Dockerfile 建立映像
       └─ FROM pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64
            └─ pdf2htmlEX 二進位已內建於映像
       └─ COPY --from=oven/bun:1 bun → /usr/local/bin/bun
       └─ bun install --frozen-lockfile
       └─ CMD ["bun", "run", "src/index.ts"]
  └─ 掛載 ./src → /app/src（原始碼同步）
  └─ 掛載 ./logs → /app/logs（log 持久化）
  └─ 監聽 localhost:3000
```

## API 路由總覽

### 頁面路由

| 方法 | 路徑 | Controller | 說明 |
|------|------|-----------|------|
| GET | `/` | `page.controller.ts::showIndex` | 回傳首頁 HTML（`src/views/upload.html`） |

### REST API

| 方法 | 路徑 | Controller | 說明 |
|------|------|-----------|------|
| GET | `/event-logs` | `eventLog.controller.ts::getEventLogs` | 查詢 event log，支援 `?traceId=` 過濾 |
| DELETE | `/event-logs` | `eventLog.controller.ts::deleteEventLogs` | 清除所有 event log 檔案 |
| POST | `/pdf/to-html` | `pdf.controller.ts::pdfToHtml` | 上傳 PDF，回傳自含 HTML（`{ html: "..." }`） |

> 所有路由的 response 均含 `X-Trace-Id` header（由全域 `traceIdMiddleware` 注入）。

## Middleware 架構

### `traceIdMiddleware`（`src/middleware/traceId.middleware.ts`）

掛載於 `app.use('*', ...)` — 在所有路由 handler 之前執行。

```
Request 進入
  │
  ├─ crypto.randomUUID()  → traceId
  ├─ c.set('traceId', traceId)
  ├─ start = Date.now()
  │
  └─ await next()  →  [Controller 執行]
                          │
                          └─ （若錯誤）c.set('error', String(err))
  │
  ├─ writeEventLog({ traceId, method, path, status, duration, error })
  └─ c.header('X-Trace-Id', traceId)
```

Controller 若需在錯誤情境下記錄錯誤訊息，只需在 catch 區塊呼叫 `c.set('error', String(err))`，middleware 會自動在 log 中附加 `error` 欄位。**不需要在 controller 內直接呼叫 log 相關函式。**

### 加入新 Middleware 的位置

在 `src/app.ts` 以 `app.use('*', newMiddleware)` 掛載，確保在路由定義之前。

## 資料流：Event Log 請求

```
呼叫方
  │  GET /event-logs?traceId=<uuid>
  │──────────────────►
  │                   traceIdMiddleware 先執行（產生新 traceId）
  │                   eventLog.controller::getEventLogs()
  │                   eventLog.model::readEventLogs(traceId)
  │                     └─ 讀取 logs/event-*.log（排序後合併）
  │                     └─ 依 traceId 過濾
  │◄────────────────── 200 JSON + X-Trace-Id header
  │                   （本次 /event-logs 請求本身也被寫入 log）
```

## 統一回應格式

目前 REST API 端點（`/event-logs`）直接回傳 JSON array 或 `{ deleted: number }`，無外層 wrapper。後續新增端點時，建議維持相同風格或統一改為：

```json
{ "data": [...] }
```

## 認證與授權

目前**無任何認證機制**，所有路由均為公開存取。

若需加入認證，在 `src/middleware/` 新增 middleware 檔案後於 `src/app.ts` 掛載：

```typescript
app.use('/event-logs/*', authMiddleware)
```

## TypeScript 設定重點

`tsconfig.json` 的關鍵選項及其影響：

| 選項 | 值 | 影響 |
|------|----|------|
| `module` | `NodeNext` | import 路徑必須加 `.js` 副檔名（即使來源是 `.ts`） |
| `verbatimModuleSyntax` | `true` | 型別匯入必須用 `import type`，否則編譯失敗 |
| `jsxImportSource` | `hono/jsx` | 可在 Hono handler 中直接使用 JSX，無需 React |
| `strict` | `true` | 啟用全部嚴格型別檢查 |
| `outDir` | `./dist` | 編譯輸出目錄 |
| `target` | `ESNext` | 輸出現代 JS，不降版 |

## 第三方套件狀態

| 套件 | 狀態 | 整合位置 | 用途 |
|------|------|---------|------|
| `pdftohtmljs` | ✅ 已整合 | `src/utils/pdfToHtml.ts` | 呼叫系統 `pdf2htmlEX` 二進位，將 PDF 轉為 HTML |
| `zod` | ✅ 已整合 | `src/controllers/pdf.controller.ts` | `POST /pdf/to-html` 的 request 驗證 |
| `pdf-lib` | 🔲 待整合 | 新路由（如 POST `/pdf/sign`） | 在 PDF 頁面嵌入文字、圖片或數位簽章 |
| `@pdf-lib/fontkit` | 🔲 待整合 | 與 pdf-lib 搭配使用 | 嵌入自訂字型（中文字型支援） |
| `pdf-parse` | 🔲 待整合 | 新路由（如 POST `/pdf/parse`） | 從 PDF buffer 擷取純文字 |
| `deepl-node` | 🔲 待整合 | 新路由（如 POST `/pdf/translate`） | 呼叫 DeepL API 翻譯文字 |
| `swagger-jsdoc` | 🔲 待整合 | app 初始化階段 | 自動從 JSDoc 生成 OpenAPI 3.0 規格 |
