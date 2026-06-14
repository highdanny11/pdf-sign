# pdf-sign

PDF 上傳與處理 Web 服務。提供瀏覽器表單上傳 PDF，後端使用 Hono.js 接收並儲存檔案，後續將整合簽章、解析與翻譯功能。

## 技術棧

| 層次 | 套件 | 版本 | 用途 |
|------|------|------|------|
| 運行環境 | Node.js | ≥20 | 伺服器執行環境 |
| Web 框架 | hono | ^4.12 | 路由、請求處理、HTML 回應 |
| Node 適配器 | @hono/node-server | ^1.19 | 將 Hono 掛載至 Node.js HTTP server |
| PDF 操作 | pdf-lib | ^1.17 | PDF 頁面編輯、簽章嵌入（待整合） |
| PDF 字型 | @pdf-lib/fontkit | ^1.1 | pdf-lib 的字型渲染支援（待整合） |
| PDF 解析 | pdf-parse | ^2.4 | 從 PDF 擷取文字內容（待整合） |
| 翻譯 | deepl-node | ^1.27 | DeepL 翻譯 API 客戶端（待整合） |
| API 文件 | swagger-jsdoc | ^6.3 | OpenAPI 3.0 文件自動生成（待整合） |
| 驗證 | zod | ^4.4 | Schema 驗證（待整合） |
| 測試 | vitest | ^4.1 | 單元測試框架 |
| 語言 | TypeScript | ^5.8 | 靜態型別 |
| 套件管理 | Bun | latest | 安裝依賴、執行腳本 |

## 快速開始

```bash
# 1. 安裝依賴
bun install

# 2. 啟動開發伺服器（熱重載）
bun run dev

# 3. 開啟瀏覽器
open http://localhost:3000
```

伺服器啟動後，瀏覽器會顯示一個檔案上傳表單。選擇 PDF（或任意檔案）後點選「送出」，檔案會被存至專案根目錄的 `uploads/` 資料夾。

## 常用指令

| 指令 | 說明 |
|------|------|
| `bun run dev` | 開發模式，tsx watch 熱重載 |
| `bun run build` | TypeScript 編譯至 `dist/` |
| `bun run start` | 執行編譯後的 `dist/index.js` |
| `bun test` | 執行 vitest 測試套件 |

## 文件索引

| 文件 | 內容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架構設計、目錄結構、API 路由、資料流 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、新增功能步驟 |
| [FEATURES.md](./FEATURES.md) | 功能清單、完成狀態、行為描述 |
| [TESTING.md](./TESTING.md) | 測試規範、撰寫指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日誌 |
| [plans/](./plans/) | 功能開發計畫（進行中） |
| [plans/archive/](./plans/archive/) | 已完成計畫歸檔 |
