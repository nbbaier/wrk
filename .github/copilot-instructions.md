# wrk CLI - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview

`wrk` is a minimal CLI tool for quickly opening projects in your IDE. Built with Bun (TypeScript runtime), it manages workspaces and projects with an interactive interface for project selection.

**Key Architecture:**
- TypeScript CLI application built with Bun
- Configuration-driven workspace/project management
- Interactive menus with `inquirer`
- Spawns configurable IDEs to open projects
- JSON output support for scripting

## Required Dependencies

**CRITICAL:** This project requires Bun runtime, NOT Node.js.

Install Bun runtime:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

## Working Effectively

### Bootstrap the repository
```bash
# Install dependencies - FAST: <1 second. NEVER CANCEL. Set timeout to 60+ seconds for safety.
bun install

# Run tests - FAST: <1 second. NEVER CANCEL. Set timeout to 60+ seconds.
bun test

# Build the project - FAST: <1 second. NEVER CANCEL. Set timeout to 60+ seconds.
bun run build

# Verify build output
ls -la dist/wrk.js

# Test the built CLI
bun dist/wrk.js --help
bun dist/wrk.js --version
```

### Development workflow
```bash
# Type check (optional, no script provided by default)
bunx tsc --noEmit  # Takes ~1.5 seconds

# Build and link for local testing
bun run link  # Takes <1 second, builds + links globally

# Test the globally linked version
wrk --version
```

### Testing commands
```bash
# Run all tests
bun test  # 6 tests, completes in <1 second

# Test with custom config (useful for development)
WRK_CONFIG_HOME=/tmp bun dist/wrk.js --config-path
```

## Validation Scenarios

**MANUAL VALIDATION REQUIREMENT:** After making changes, ALWAYS test these complete scenarios:

### Scenario 1: Basic CLI functionality
```bash
# Test help and version
wrk --help
wrk --version
wrk --config-path

# Test listing (should show "No workspaces found" message)
WRK_CONFIG_HOME=/tmp wrk list
```

### Scenario 2: Workspace and project management
```bash
# Setup test environment
mkdir -p /tmp/test-workspace/client-work/myapp
WRK_CONFIG_HOME=/tmp mkdir -p /tmp/wrk
echo '{"workspace":"/tmp/test-workspace","ide":"echo"}' > /tmp/wrk/config.json

# Test listing functionality
WRK_CONFIG_HOME=/tmp wrk list                    # Should show "client (1 projects)"
WRK_CONFIG_HOME=/tmp wrk list client             # Should show "myapp (today)"
WRK_CONFIG_HOME=/tmp wrk list client --json      # Should output valid JSON

# Test project path resolution
WRK_CONFIG_HOME=/tmp wrk cd client myapp         # Should output full path
```

### Scenario 3: Dry-run operations (safe testing)
```bash
# Test project opening (dry-run, no actual IDE launch)
WRK_CONFIG_HOME=/tmp wrk client --project myapp --dry-run

# Test project creation (dry-run)
WRK_CONFIG_HOME=/tmp wrk create client newapp --dry-run
```

### Scenario 4: Error handling
```bash
# Test missing IDE error
WRK_CONFIG_HOME=/tmp wrk client --project myapp --ide nonexistent-editor
# Should show: "IDE command 'nonexistent-editor' not found. Please install it or run 'wrk config --set ide=<your-ide>' to set a different IDE."
```

## Key Files and Structure

```
wrk/
├── src/
│   ├── index.ts           # Main CLI application logic
│   ├── command-router.ts  # Command parsing and routing
│   ├── utils.ts          # Utility functions (path, time, config)
│   └── index.test.ts     # Unit tests
├── dist/
│   └── wrk.js            # Built executable (created by build script)
├── package.json          # Bun project configuration
├── tsconfig.json         # TypeScript configuration
├── bun.lock             # Bun lockfile (like package-lock.json)
└── README.md            # Basic usage instructions
```

**Important locations:**
- Main entry point: `src/index.ts` (825 lines of CLI logic)
- Command parsing: `src/command-router.ts` (handles all CLI argument parsing)
- Utilities: `src/utils.ts` (path expansion, time formatting, config paths)

## Build and Deployment

### Build process
```bash
# Standard build (creates dist/wrk.js)
bun run build

# Global installation (requires sudo for /usr/local/bin)
bun run install-global

# Local linking (recommended for development)
bun run link
```

### Build timings (set appropriate timeouts)
- `bun install`: ~50ms (set timeout 60+ seconds)
- `bun test`: ~26ms (set timeout 60+ seconds) 
- `bun run build`: ~40ms (set timeout 60+ seconds)
- `bunx tsc --noEmit`: ~1.4 seconds (set timeout 60+ seconds)

**NEVER CANCEL** any of these commands - they complete very quickly but set generous timeouts.

## Configuration System

Configuration file locations (in order of precedence):
1. `$WRK_CONFIG_HOME/wrk/config.json`
2. `$XDG_CONFIG_HOME/wrk/config.json` 
3. `~/.config/wrk/config.json` (default)

Configuration format:
```json
{
  "workspace": "/path/to/workspace",
  "ide": "cursor",
  "lastProjectPath": "/path/to/last/project"
}
```

### Configuration commands
```bash
# Get config values
wrk config --get workspace
wrk config --get ide

# Set config values
wrk config --set workspace=/new/path
wrk config --set ide=vscode

# Edit config file
wrk config --edit
```

## CLI Commands Reference

### Core commands
- `wrk` - Open last project
- `wrk <workspace>` - Open project from workspace (interactive menu)
- `wrk create <workspace> [project]` - Create new project
- `wrk list [workspace]` - List workspaces or projects
- `wrk cd <workspace> <project>` - Print project path

### Flags
- `--project/-p <name>` - Open specific project directly
- `--json` - JSON output for scripting
- `--dry-run` - Preview actions without executing
- `--ide/-i <command>` - Override IDE for this invocation

### Configuration
- `wrk config` - Open config file
- `wrk config --get <key>` - Get config value
- `wrk config --set <key>=<value>` - Set config value
- `wrk --config-path` - Show config file location

## Common Development Tasks

### Adding new CLI commands
1. Update `Command` interface in `src/command-router.ts`
2. Add parsing logic in `parseCommand()` function
3. Add command handler in `WrkCLI.run()` method in `src/index.ts`
4. Update help text in `showHelp()` method

### Adding new configuration options
1. Update `Config` interface in `src/index.ts`
2. Add validation in config get/set methods
3. Update help text and examples

### Testing changes
1. Build: `bun run build`
2. Test: `bun test`
3. Manual validation: Run validation scenarios above
4. Type check: `bunx tsc --noEmit`

## Troubleshooting

### Bun not found
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Build failures
- Ensure Bun is installed and in PATH
- Run `bun install` first
- Check TypeScript errors with `bunx tsc --noEmit`

### IDE not found errors
- The CLI validates IDE binaries before launching
- Use `--ide` flag to override: `wrk client --ide code`
- Update config: `wrk config --set ide=your-editor`

### Interactive prompts hanging
- Use `--dry-run` for testing
- Pre-create workspaces for non-interactive testing
- Use environment variable overrides: `WRK_CONFIG_HOME=/tmp`

## Important Notes

- **Runtime**: Uses Bun, NOT Node.js - all commands use `bun` prefix
- **Fast builds**: All operations complete in <2 seconds typically
- **Interactive**: CLI uses inquirer for user prompts - test with dry-run or pre-created configs
- **Safe IDE spawning**: Uses array-based spawn to prevent command injection
- **Path handling**: Supports tilde (`~`) expansion and environment variables
- **Cross-platform**: Works on macOS, Linux; Windows not explicitly tested
- **No CI**: No GitHub Actions workflow exists currently
- **No linting**: No ESLint or similar tools configured