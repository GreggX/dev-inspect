# dev-inspect

A framework-agnostic developer dashboard that scans your project for code quality metrics, displays them in an interactive web UI, and optionally gates CI on configurable thresholds.

## Features

- **16 built-in checks** — lint, typecheck, tests, coverage, build, bundle size, TODOs, duplicates, env vars, licenses, complexity, secrets, type coverage, test quality, git stats, and dependency audit
- **Interactive dashboard** — Vite-powered SPA with tabs for Metrics, UI Health, Trends, Test Quality, and Settings
- **UI Inspector** — overlay injected into proxied apps for element picking, React fiber inspection, and annotations
- **CI mode** — run checks and fail on threshold breaches (`pnpm check`)
- **MCP server** — expose project health data to Claude and other AI tools
- **Reports** — generate markdown or JSON reports (`pnpm report`)

## Quick Start

```bash
# Install dependencies
pnpm install

# Initialize config in your project
pnpm init

# Collect metrics
pnpm collect

# Start the dashboard (serves on port 4444, proxies your app on port 3000)
pnpm dev
```

## Usage with Another Project

```bash
npx tsx packages/cli/src/cli.ts --root ../my-app init --yes
npx tsx packages/cli/src/cli.ts --root ../my-app collect
npx tsx packages/cli/src/cli.ts --root ../my-app dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dashboard server (port 4444) |
| `pnpm init` | Scan project, create `.dev-inspect.json` config |
| `pnpm collect` | Run enabled checks, save to `.dev-metrics/` |
| `pnpm check` | CI mode — run checks, exit 1 on failures |
| `pnpm report` | Markdown report to stdout (`--format json`, `--output file.md`) |
| `pnpm build` | Build all packages (dashboard + inspector) |
| `pnpm mcp` | Start MCP server (stdio transport) |

## Packages

| Package | Description |
|---------|-------------|
| `@dev-inspect/cli` | CLI entry point, HTTP server, metrics collector, MCP server, config |
| `@dev-inspect/dashboard` | Vite + vanilla TypeScript SPA with custom reactive component system |
| `@dev-inspect/inspector` | UI inspector overlay injected into proxied apps (IIFE bundle) |

## Configuration

Create a `.dev-inspect.json` in your project root (or run `pnpm init`):

```json
{
  "checks": {
    "lint": { "enabled": true, "command": "eslint ." },
    "typecheck": { "enabled": true },
    "tests": { "enabled": true },
    "coverage": { "enabled": true },
    "testquality": { "enabled": true }
  },
  "thresholds": {
    "coverageMin": 80,
    "bundleSizeMaxKb": 500,
    "maxSecrets": 0
  }
}
```

Checks with `"command": "internal"` (the default for most checks) use built-in analysis. You can override with a custom command.

## Checks

| Check | Type | Description |
|-------|------|-------------|
| `lint` | external | Run your linter (eslint, biome, etc.) |
| `typecheck` | external | TypeScript type checking |
| `tests` | external | Run test suite (vitest, jest, etc.) |
| `coverage` | internal | Parse coverage reports |
| `build` | external | Run build command |
| `bundlesize` | internal | Measure build output size |
| `todos` | internal | Count TODO/FIXME/HACK comments |
| `duplicates` | internal | Detect duplicate code blocks |
| `envcheck` | internal | Validate environment variables |
| `licenses` | internal | Scan dependency licenses |
| `complexity` | internal | Measure code complexity |
| `secrets` | internal | Scan for leaked secrets/keys |
| `typecoverage` | internal | Measure TypeScript type coverage |
| `testquality` | internal | Analyze test assertion density, smells, and quality scores |

## Requirements

- Node.js >= 18
- pnpm

## License

Private
