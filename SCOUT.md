# Scout Report: wrk CLI

## Overview
`wrk` is a minimal, fast CLI tool built with **Bun** and **TypeScript** for managing and quickly opening projects in your IDE. It organizes projects into "workspaces" (directories) and provides interactive menus to select and open them.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/) (Strictly enforced; no Node.js)
- **Language:** TypeScript
- **CLI Framework:** Hybrid approach using [Commander](https://github.com/tj/commander.js) for standard commands and custom parsing for workspace shortcuts.
- **Interactivity:** [Inquirer](https://github.com/SBoudrias/Inquirer.js) for prompts.
- **Testing:** `bun:test`

## Key Features
- **Project Navigation:**
  - `wrk`: Open the last accessed project.
  - `wrk <workspace>`: Interactively select a project from a specific workspace (e.g., `wrk client`).
  - `wrk cd <workspace> <project>`: Output project path (for shell navigation).
- **Management:**
  - `wrk create <workspace> [project]`: Create new projects.
  - `wrk list [workspace]`: View available workspaces and projects.
- **Configuration:**
  - Stored in `~/.config/wrk/config.json`.
  - Configurable `workspace` root and `ide` command (default: `cursor`).
  - `wrk config` commands to view/edit settings.

## Architecture
- **Entry Point:** `src/index.ts` (`WrkCLI` class).
- **Routing:** `src/command-router.ts`. Handles `wrk <command>` vs `wrk <workspace>` logic.
- **Conventions:**
  - Workspaces are subdirectories in your main workspace folder ending in `-work` (e.g., `~/workspace/client-work`).
  - Projects are subdirectories within a workspace.

## Getting Started
1. **Install Bun:** `curl -fsSL https://bun.sh/install | bash`
2. **Install Dependencies:** `bun install`
3. **Build:** `bun run build` (Outputs to `dist/wrk.js`)
4. **Link (Optional):** `bun run link` to make `wrk` available globally.
5. **Run Tests:** `bun test`

## Current Status
- Core functionality (open, create, list, config) is implemented.
- Basic unit tests exist for utilities (`src/utils.ts`).
- **Note:** The project strictly adheres to Bun APIs (`Bun.file`, `Bun.spawn`) instead of Node.js equivalents where possible.
