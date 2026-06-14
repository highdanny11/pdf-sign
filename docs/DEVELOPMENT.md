# DEVELOPMENT.md

## 開發環境設定

```bash
# 必要條件：Node.js ≥20、Bun（套件管理）
bun install     # 安裝依賴
bun run dev     # 啟動開發伺服器（http://localhost:3000，tsx watch 熱重載）
```

注意：根目錄存在 `bun.lock`，本專案統一使用 **Bun** 管理套件。勿使用 `npm install` 或 `yarn`，以避免 lockfile 衝突。

## 環境變數

目前程式碼**未讀取任何環境變數**，但後續整合第三方服務時需要：

| 變數名稱 | 用途 | 必要性 | 預設值 |
|---------|------|--------|--------|
| `PORT` | 伺服器監聽埠號 | 選填 | `3000`（`src/index.ts` 已讀取 `process.env.PORT`） |
| `DEEPL_API_KEY` | DeepL 翻譯 API 金鑰 | 使用翻譯功能時必填 | 無 |

環境變數應存於 `.env`（已加入 `.gitignore`，不進 Git）。建議新增 `.env.example` 作為範本。

## 命名規則

| 項目 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | `<name>.routes.ts` | `page.routes.ts`, `eventLog.routes.ts` |
| Controller 檔案 | `<name>.controller.ts` | `page.controller.ts`, `eventLog.controller.ts` |
| Model 檔案 | `<name>.model.ts` | `eventLog.model.ts` |
| Middleware 檔案 | `<name>.middleware.ts` | `traceId.middleware.ts` |
| 工具函式檔案 | `camelCase.ts` | `sanitizeFilename.ts` |
| 函式 | `camelCase` | `writeEventLog`, `showIndex` |
| 型別 / 介面 | `PascalCase` | `EventLogEntry`, `AppEnv` |
| 常數（模組級） | `UPPER_SNAKE_CASE` | `LOG_DIR`, `MAX_LOG_BYTES`, `RETAIN_DAYS` |
| Hono app 實例 | `app`（慣例） | `const app = new Hono<AppEnv>()` |
| HTTP handler 參數 | `c`（Hono Context 慣例） | `showIndex(c: Context<AppEnv>)` |
| Hono 路由群組 | `<name>Routes` | `pageRoutes`, `eventLogRoutes` |
| Zod schema | `<名稱>Schema` | `uploadBodySchema`, `signOptionsSchema` |

## 模組系統說明

本專案使用 `"module": "NodeNext"` + `"type": "module"`（package.json）。這是 Node.js 原生 ESM，有以下注意事項：

1. **Import 路徑必須明確加副檔名**：

   ```typescript
   // 正確
   import { parseFile } from './pdf-handler.js'

   // 錯誤（NodeNext 不允許省略副檔名）
   import { parseFile } from './pdf-handler'
   ```

2. **型別匯入需用 `import type`**（`verbatimModuleSyntax: true`）：

   ```typescript
   // 正確
   import type { PDFDocument } from 'pdf-lib'
   import { PDFDocument } from 'pdf-lib'  // 若同時需要值，這樣也可以

   // 錯誤（僅型別卻用一般 import）
   import { PDFDocument } from 'pdf-lib'  // 若只用作型別標注
   ```

3. **無 `__dirname`**：ESM 中需用以下替代：

   ```typescript
   import { fileURLToPath } from 'url'
   import path from 'path'

   const __filename = fileURLToPath(import.meta.url)
   const __dirname = path.dirname(__filename)
   ```

## JSDoc 格式說明

計畫整合 `swagger-jsdoc` 自動生成 OpenAPI 文件，路由 handler 須加 JSDoc 標注。

**範例（POST /file）：**

```typescript
/**
 * @openapi
 * /file:
 *   post:
 *     summary: 上傳檔案
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       302:
 *         description: 上傳成功，重新導向至首頁
 *       400:
 *         description: 缺少 file 欄位
 */
app.post('/file', async (c) => { ... })
```

## 新增 API 路由的步驟

1. 在 `src/routes/` 新增 `<name>.routes.ts`，使用 `new Hono()` 定義路由，並 export 路由群組
2. 在 `src/controllers/` 新增 `<name>.controller.ts`，handler 參數型別用 `Context<AppEnv>`（需 try/catch，catch 中呼叫 `c.set('error', String(err))`）
3. 若有業務邏輯或 I/O 操作，在 `src/models/` 新增 `<name>.model.ts`
4. 在 `src/app.ts` 以 `app.route('/', newRoutes)` 掛載新路由群組
5. 若需要 request 驗證，定義 Zod schema 並在 controller 內呼叫 `.safeParse()`
6. 加上 JSDoc `@openapi` 標注（待 swagger-jsdoc 整合後啟用）
7. 在 `docs/FEATURES.md` 更新功能狀態與行為描述
8. 在 `docs/plans/` 建立對應的計畫文件（見下方計畫歸檔流程）

## 新增 Middleware 的步驟

1. 在 `src/middleware/` 新增 `<name>.middleware.ts`
2. 型別使用 `MiddlewareHandler<AppEnv>`
3. 在 `src/app.ts` 以 `app.use('*', newMiddleware)` 或指定路徑掛載，**必須在 `app.route()` 之前**

```typescript
// src/middleware/example.middleware.ts
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types/env.js'

export const exampleMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  // 前置邏輯...
  await next()
  // 後置邏輯（response 已產生）...
}

// src/app.ts
app.use('*', exampleMiddleware)   // 全域
app.use('/api/*', exampleMiddleware)  // 特定前綴
```

## 計畫歸檔流程

### 檔案命名

```
docs/plans/YYYY-MM-DD-<feature-name>.md
```

範例：`docs/plans/2026-06-14-pdf-signing.md`

### 計畫文件結構

```markdown
# [功能名稱] 開發計畫

## User Story
As a [角色], I want to [行為], so that [目的].

## Spec
- 端點：POST /pdf/sign
- 輸入：...
- 輸出：...
- 限制：...

## Tasks
- [ ] 實作 PDF 讀取
- [ ] 整合 pdf-lib 簽章
- [ ] 加入 zod 驗證
- [ ] 撰寫測試
```

### 完成後步驟

1. 將計畫檔移至 `docs/plans/archive/`：

   ```bash
   mv docs/plans/2026-06-14-pdf-signing.md docs/plans/archive/
   ```

2. 更新 `docs/FEATURES.md`：將功能狀態從「計畫中」改為「已完成」
3. 更新 `docs/CHANGELOG.md`：加入版本條目
