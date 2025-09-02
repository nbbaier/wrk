### wrk code review and improvement recommendations

This document summarizes a thorough review of the current `wrk` CLI codebase and proposes targeted improvements. Recommendations are grouped by area and prioritized with quick wins first.

**Progress Summary:**

-  [x] **Completed**: 12 items (API structure improvements, tilde expansion, version flag, unit tests, quick wins)
-  [ ] **Not Implemented**: 29 items
-  **Overall Progress**: 12/41 items completed (29.3%)

---

### Quick wins (low effort, high value)

-  [x] **Use `path.join` in `getWorkspacePath`**: Replace string concatenation with `join(expandedWorkspace, `${workspaceName}-work`)` to avoid path separator issues on non-Unix systems. _(Already implemented)_
-  [x] **Prefer `process.exitCode` over `process.exit`**: Improves testability and avoids abrupt termination in async flows. Return early after setting exit codes. _(Fixed)_
-  [x] **Lazy-load `inquirer`**: Import `inquirer` only when interactive prompts are needed (dynamic `await import('inquirer')`). Reduces startup time and bundle size for non-interactive commands. _(Already implemented)_
-  [x] **Parallelize filesystem reads**: Use `Promise.all`/`allSettled` when mapping `readdir`/`stat` calls in `listProjectsInWorkspace` and when counting projects in `listAllWorkspaces`. _(Already implemented)_
-  [x] **Harden tilde expansion**: Tilde expansion is done in some places but not all. Normalize by expanding `~` consistently via `os.homedir()` and a small helper. _(16c78a2)_
-  [x] **Validate `config.ide` and spawn safely**: Use argument-array spawning (e.g., `Bun.spawn` with `{ cmd: [ide, projectPath] }`) to avoid shell injection and whitespace parsing issues. Validate the binary exists, error clearly if not. _(Already implemented)_
-  [x] **Add `--version` flag**: Print `package.json` version alongside the existing help. _(Already implemented in original codebase)_
-  [x] **Improve help text consistency**: Include all available commands and any new flags suggested below; add a short description per command. _(Enhanced with config info)_

---

### CLI UX and feature suggestions

-  [ ] Behavior change: When opening a project, cd into it and open the project in the IDE.

-  [ ] **Non-interactive flags for automation**

   -  `wrk <workspace> --project/-p <project>`: Open a specific project directly without a menu
   -  `wrk create <workspace> <project>`: Create with a single command (no prompt)
   -  `wrk list <workspace>`: List all projects in a workspace
   -  `wrk list --json`: Emit JSON for scripting
   -  `wrk cd <workspace> <project>`: cd into a project without opening the IDE
   -  `wrk --config-path`: Print the resolved config path
   -  `wrk --version/-v`, `wrk --help/-h`

-  [ ] **Config management subcommands**

   -  `wrk config --get <key>` → prints value
   -  `wrk config --set <key>=<value>` → updates config safely
   -  `wrk config --edit` → opens config (current default)

-  [ ] **Quality-of-life**
   -  `--dry-run` to preview actions (e.g., which path will be opened/created)
   -  Optional `--ide/-i <cmd>` flag to override per-invocation

---

### Correctness and robustness

-  [ ] **Path construction**: Use `join()` everywhere; avoid manual "${base}/${child}" concatenation.
-  [x] **Tilde and env expansion**: Centralize expansion with a helper: expand `~`, then resolve env vars and normalize with `resolve()`. _(16c78a2)_
-  [ ] **Cross-platform checks**: Ensure directory checks use Node/Bun APIs consistently; prefer `stat` from `fs/promises` for directories and files. Using `Bun.file(path)` for directories works but is non-obvious; a single approach improves clarity.
-  [ ] **Safer process spawning**: Avoid shell interpolation when spawning the IDE. If the IDE string contains spaces/flags, use an array form to prevent injection.
-  [ ] **Consistent error surfaces**: Print actionable messages and set `process.exitCode` instead of exiting mid-flow. Keep messages on stderr via `console.error`.

---

### Performance

-  [ ] **Parallel filesystem ops**: In `listProjectsInWorkspace`, gather `stat` results with `Promise.allSettled` to avoid failing the entire listing for a single file error and to reduce total time.
-  [ ] **Avoid repeated deep stats for counts**: In `listAllWorkspaces`, if only counts are needed, a simple `readdir` with `dirent.isDirectory()` is enough; skip per-project `stat` unless last-access time is shown.
-  [ ] **Bundle size**: Lazy-load `inquirer` to reduce default execution path size; consider marking `inquirer` as external in the bundler if you keep `bin` non-bundled, or keep the status quo and rely on lazy import.

---

### API and code structure

-  [x] **Extract pure helpers**: Move repeated logic to utilities (e.g., `expandHomePath`, `getTimeAgo`, `getConfigPath`). Makes them unit-testable and reusable. _(16c78a2)_
-  [x] **Inject configuration paths for tests**: Allow a `WRK_CONFIG_HOME` env var to fully override config path, enabling hermetic tests. _(16c78a2)_
-  [x] **Command parsing**: The current minimal parser is fine; if the surface grows, consider `commander`-style parsing. If avoiding dependencies, keep the switch but centralize command/flag parsing in a small router. _(700ac31)_

---

### Testing

-  [ ] **Add integration tests for CLI flows** (using Bun):

   -  Help/Version output snapshot
   -  Config creation in a temp directory (override with `WRK_CONFIG_HOME`)
   -  `list` with empty and populated workspaces
   -  `create <workspace> <project>` (non-interactive)
   -  `open` last project path behavior
   -  Error paths: missing IDE binary, missing workspace, permission errors

-  [x] **Unit tests for helpers**: `getTimeAgo`, path expansion, `getWorkspacePath`, and config read/write round-trips. _(522bc2d)_

-  [ ] **Test ergonomics**: Avoid `process.exit` in code paths under test; rely on return values and `process.exitCode` to assert behavior.

---

### Error handling and messaging

-  [ ] **Actionable messages**: Provide next steps, e.g., when an IDE command is missing: "Install 'cursor' or run 'wrk config --set ide=<your-ide>'".
-  [ ] **Standardize exit codes**: 0 success, 1 usage/config errors, 2 missing resources, etc., documented in README.

---

### Security

-  [ ] **Command injection mitigation**: Do not pass user-configured `ide` through a shell. Use array arguments with `Bun.spawn`. Validate the path/binary exists with a pre-check.
-  [ ] **Config validation**: Validate and trim fields before saving; reject control characters and ensure absolute workspace paths after expansion.

---

### Documentation

-  [ ] **README**

   -  Add quick install and global usage (`bun link` or publish instructions)
   -  Document all commands and flags including new non-interactive options
   -  Explain config location and precedence (env → XDG → default)
   -  Include examples for scripting (`wrk list --json | jq`)
   -  Note supported platforms and limitations

-  [ ] **CHANGELOG**: Start a simple `CHANGELOG.md` for future releases.

---

### Build, release, and CI

-  [ ] **Package metadata**: Add `repository`, `bugs`, and `homepage` fields to `package.json` for better discoverability.
-  [ ] **Global install path**: Document `bun run install-global` and a safe alternative (`bun link`), clarifying macOS/Linux permissions.
-  [ ] **CI**: Add a GitHub Actions workflow that runs Bun tests on macOS and Linux, and performs a build. Optionally lint.

---

### TypeScript configuration

-  [ ] Current `tsconfig` is solid for Bun bundler mode. Consider:
   -  Enabling `noUnusedLocals`/`noUnusedParameters` once code stabilizes
   -  Removing `allowJs` if only TS is used
   -  Keeping `skipLibCheck: true` for faster CI unless typing issues arise

---

### Suggested targeted edits (brief)

-  [ ] **Path joins**: Use `join(resolve(expanded), `${workspace}-work`)` instead of string interpolation.
-  [ ] **Spawn IDE**: Replace shell interpolation with safe spawn array and show a clear error if the binary is missing.
-  [ ] **Lazy inquirer**: Dynamically import `inquirer` only in interactive methods.
-  [ ] **Parallel listing**: Use `Promise.allSettled` for project stats and for counting across workspaces.
-  [ ] **Return codes**: Replace `process.exit()` with `process.exitCode` and early returns in all error paths.

---

### Roadmap (proposed)

1. [ ] Quick wins: path joins, exit codes, lazy `inquirer`, safe spawn
2. [ ] Non-interactive flags and improved help/version
3. [ ] Parallelize listings and add JSON output
4. [x] Config subcommands and env overrides for tests _(16c78a2, 522bc2d)_
5. [ ] Test suite expansion (integration + unit)
6. [ ] CI and packaging metadata updates

---

### Overall assessment

The codebase is clean, readable, and already Bun-native with a passing test suite and a working build. The improvements above will make the CLI more robust, scriptable, and cross-platform friendly while preserving the minimal footprint and simplicity of the current design.
