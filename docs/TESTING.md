# TESTING.md

## 目前狀態

`vitest` 已安裝（`package.json` dependencies），但**目前尚無任何測試檔案**。本文件記錄測試規範，供實作測試時參照。

> 注意：`vitest` 目前被列在 `dependencies` 而非 `devDependencies`，這是個錯誤——測試框架不應打包進生產環境。後續應將其移至 `devDependencies`：
> ```bash
> bun remove vitest && bun add -d vitest
> ```

## 測試框架

- **[Vitest](https://vitest.dev/)** — Vite 生態的測試框架，相容 Jest API（`describe`、`it`/`test`、`expect`）
- 執行指令：`bun test`

## 測試檔案組織

建議測試檔案與原始碼並排（co-located），或集中於 `src/__tests__/`：

```
src/
├── index.ts
├── pdf-handler.ts        （待建立）
├── pdf-handler.test.ts   （測試並排）
└── __tests__/
    └── routes.test.ts    （整合測試）
```

## 撰寫測試的步驟

### 1. 單元測試（純函式）

對無副作用的工具函式直接測試輸入輸出：

```typescript
// src/file-utils.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from './file-utils.js'

describe('sanitizeFilename', () => {
  it('removes path separators', () => {
    expect(sanitizeFilename('../etc/passwd')).toBe('etcpasswd')
  })

  it('preserves extension', () => {
    expect(sanitizeFilename('my-doc.pdf')).toBe('my-doc.pdf')
  })
})
```

### 2. Hono 路由整合測試

Hono 提供 `app.request()` 方法，可在不啟動真實 HTTP server 的情況下測試路由：

```typescript
// src/__tests__/routes.test.ts
import { describe, it, expect } from 'vitest'
import app from '../app.js'   // 需將 app 從 index.ts 分離並 export

describe('GET /', () => {
  it('returns HTML with upload form', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('<form')
    expect(body).toContain('action="/file"')
  })
})

describe('POST /file', () => {
  it('returns 400 when no file provided', async () => {
    const formData = new FormData()
    const res = await app.request('/file', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('No file uploaded')
  })

  it('redirects to / after successful upload', async () => {
    const formData = new FormData()
    formData.append('file', new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }))
    const res = await app.request('/file', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})
```

> **前提**：需先將 `app` 從 `src/index.ts` 中拆分並 export。目前 `index.ts` 同時定義 app 與啟動 server，測試時應只 import app 而不啟動 server。拆分方式：
> ```typescript
> // src/app.ts — 只定義並 export app
> export const app = new Hono()
> app.get('/', handler)
> app.post('/file', handler)
>
> // src/index.ts — 只負責啟動 server
> import { app } from './app.js'
> serve({ fetch: app.fetch, port: 3000 }, ...)
> ```

### 3. PDF 處理測試（待實作）

測試 pdf-lib / pdf-parse 整合時，使用真實的最小化 PDF 二進位（避免 mock），放置於 `src/__tests__/fixtures/sample.pdf`。

## 執行測試

```bash
bun test                    # 執行所有測試
bun test src/pdf-handler    # 執行特定檔案
bun test --watch            # 監聽模式
bun test --coverage         # 產生覆蓋率報告（需安裝 @vitest/coverage-v8）
```

## 常見陷阱

| 陷阱 | 說明 |
|------|------|
| import 路徑缺少 `.js` | `NodeNext` 模組系統下，測試檔案 import 路徑同樣需要 `.js` 副檔名 |
| app 與 server 耦合 | 目前 `index.ts` 直接啟動 server，import 就會啟動——需先拆分 app 定義 |
| fs 副作用 | `POST /file` 會寫入真實檔案系統，整合測試後需清理 `uploads/` 測試檔案，或 mock `fs` 模組 |
| vitest 在 dependencies | 若執行 `bun run start` 發現啟動慢，確認 vitest 已移至 devDependencies |
