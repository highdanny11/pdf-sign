# CLAUDE.md

## 專案概述

pdf-sign — TypeScript + Hono.js PDF 上傳與處理伺服器，運行於 Node.js（port 3000）。目前實作檔案上傳存檔功能；已安裝但尚未整合的套件包含 pdf-lib（PDF 簽章/編輯）、pdf-parse（PDF 解析）、deepl-node（翻譯）、zod（驗證）、swagger-jsdoc（API 文件）。

## 常用指令

```bash
bun install          # 安裝依賴（本專案使用 Bun 作為套件管理器）
bun run dev          # 開發模式（tsx watch，熱重載）
bun run build        # TypeScript 編譯至 dist/
bun run start        # 執行編譯後的產物
bun test             # 執行測試（vitest）
```

> 專案根目錄有 `bun.lock`，請統一使用 `bun` 而非 `npm`/`yarn`。

## 關鍵規則

- **模組系統**：`tsconfig.json` 使用 `"module": "NodeNext"`，TypeScript 檔案內 import 路徑**必須加 `.js` 副檔名**（即使來源是 `.ts`），例如 `import { foo } from './utils.js'`。
- **純型別匯入**：`verbatimModuleSyntax: true` 已啟用，型別專用的 import 必須寫 `import type`，否則編譯錯誤。
- **JSX 支援**：`jsxImportSource` 設為 `hono/jsx`，若需要 JSX 可直接在 Hono handler 中使用，不需引入 React。
- **上傳目錄**：伺服器在 `./uploads/` 儲存檔案，該目錄在首次上傳時自動建立，**不應加入 Git**（已由 `.gitignore` 排除模式涵蓋，需確認）。
- **功能開發**：使用 `docs/plans/` 記錄功能計畫文件；完成後移至 `docs/plans/archive/`，同步更新 `docs/FEATURES.md` 與 `docs/CHANGELOG.md`。

## 詳細文件

- [./docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [./docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [./docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、環境變數
- [./docs/FEATURES.md](./docs/FEATURES.md) — 功能列表與完成狀態
- [./docs/TESTING.md](./docs/TESTING.md) — 測試規範與指南
- [./docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌
