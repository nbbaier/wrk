# AI Agent Guidelines for wrk

## Build & Verify
- **Build:** `bun run build` (Output: `dist/wrk.js`)
- **Test:** `bun test` (Single: `bun test src/index.test.ts`)
- **Type Check:** `bunx tsc --noEmit` (Run this after significant changes)
- **Install:** `bun install` (NEVER use npm, yarn, or pnpm)

## Code Style & Conventions
- **Runtime:** STRICTLY use Bun APIs (`Bun.file`, `Bun.spawn`) over `node:fs`/`child_process` when possible.
- **Imports:** Use `node:` prefix for built-ins. **MUST** use `.js` extension for relative imports.
- **Formatting:** Use tabs for indentation. Match existing style (Interfaces at top, classes).
- **Patterns:** Use `command-router.ts` for parsing. Use `inquirer` for prompts.
- **Error Handling:** Use `try/catch`, log with `console.error`, set `process.exitCode = 1`.

## Project Rules
- **Files:** Source in `src/`. Entry point `src/index.ts`.
- **Env:** Bun loads `.env` automatically. Do not use `dotenv`.
- **Tests:** Write tests in `*.test.ts` files using `import { test, expect } from "bun:test"`.
- **Dependencies:** This project depends on `bun` runtime. Do not add node-specific polyfills.
