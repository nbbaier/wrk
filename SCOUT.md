# Scout Report: wrk CLI

## Overview
`wrk` is a minimal, fast CLI tool built with **Bun** and **TypeScript** for managing and quickly opening projects in your IDE. It organizes projects into "workspaces" (directories) and provides interactive menus to select and open them.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/) (Strictly enforced; no Node.js)
- **Language:** TypeScript
- **CLI Framework:** Hybrid approach using [Commander](https://github.com/tj/commander.js) for standard commands and custom parsing for workspace shortcuts.
- **Interactivity:** [Inquirer](https://github.com/SBoudrias/Inquirer.js) for prompts.
- **Testing:** `bun:test`

## Architecture

### Core Components
1. **Entry Point** (`src/index.ts`): Main `WrkCLI` class that orchestrates all functionality
2. **Command Router** (`src/command-router.ts`): Parses CLI arguments and determines command types
3. **Utilities** (`src/utils.ts`): Helper functions for path expansion, time formatting, and config management

### Key Classes & Methods
- `WrkCLI` class: Main application controller with methods for:
  - Configuration management (`loadConfig`, `saveConfig`, `createDefaultConfig`)
  - Project operations (`openProject`, `createProjectInWorkspace`, `openLastProject`)
  - Workspace management (`listWorkspaces`, `listProjectsInWorkspace`)
  - IDE integration (`validateIdeBinary`, `openConfig`)

### Command Types
- `workspace`: Open projects from a specific workspace (e.g., `wrk client`)
- `create`: Create new projects (`wrk create client myapp`)
- `list`: View workspaces/projects (`wrk list`, `wrk list client`)
- `config`: Configuration management (`wrk config --get workspace`)
- `cd`: Print project paths for shell integration
- `last`: Open the most recently accessed project

### Configuration
- Stored in `~/.config/wrk/config.json` (or `$WRK_CONFIG_HOME/wrk/config.json`)
- Contains: `workspace` (root directory), `ide` (IDE command), `lastProjectPath`
- Workspaces are subdirectories ending in `-work` (e.g., `~/workspace/client-work`)
- Projects are subdirectories within workspaces

## Key Features
- **Project Navigation:** Interactive project selection with "last accessed" timestamps
- **IDE Integration:** Configurable IDE commands with validation
- **Shell Integration:** `cd` command for easy directory navigation
- **Scripting Support:** JSON output mode for automation
- **Dry-run Mode:** Preview actions without execution
- **Error Handling:** Comprehensive error handling with user-friendly messages

## Development Commands
- **Build:** `bun run build` (outputs to `dist/wrk.js`)
- **Test:** `bun test` (run all tests) or `bun test src/index.test.ts` (specific file)
- **Type Check:** `bunx tsc --noEmit`
- **Install:** `bun install` (NEVER use npm/yarn/pnpm)

## Testing Strategy
- Unit tests for command parsing (`command-router.test.ts`)
- Utility function tests (`index.test.ts`)
- Test coverage for configuration path resolution and time formatting

## First Tasks When Resuming
1. **Run tests** to ensure everything works: `bun test`
2. **Check type safety**: `bunx tsc --noEmit`
3. **Build the project**: `bun run build`
4. **Test basic functionality**: `bun run index.ts --help`
5. **Review any failing tests** and fix type errors first

## Code Conventions
- Use Bun APIs (`Bun.file`, `Bun.spawn`) over Node.js equivalents
- Import with `.js` extension for relative imports
- Use `node:` prefix for built-in modules
- Tabs for indentation
- Interfaces at top of files
- Error handling with try/catch and `process.exitCode = 1`

---
*Last updated: November 19, 2025*