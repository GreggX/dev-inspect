# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

dev-inspect is a framework-agnostic developer dashboard tool. Monorepo with three packages:
- **`@dev-inspect/cli`** — CLI entry point, HTTP server, metrics collector, MCP server, config system
- **`@dev-inspect/dashboard`** — Vite + vanilla TypeScript SPA with a custom reactive component system (no framework)
- **`@dev-inspect/inspector`** — UI inspector overlay injected into proxied apps, built as a single IIFE bundle

## Commands

```bash
# From workspace root:
pnpm dev              # Start dashboard server (port 4444, proxies app on port 3000)
pnpm init             # Scan project for tools, create .dev-inspect.json
pnpm collect          # Run enabled checks, save history
pnpm check            # CI mode — run checks, exit 1 on failures/threshold breaches
pnpm report           # Markdown report to stdout (--format json, --output file.md)
pnpm build            # Build all packages (dashboard + inspector)
pnpm build:dashboard  # Build dashboard only
pnpm build:inspector  # Build inspector only

# Local development against another project:
npx tsx packages/cli/src/cli.ts --root ../my-app
npx tsx packages/cli/src/cli.ts --root ../my-app init --yes
npx tsx packages/cli/src/cli.ts --root ../my-app collect
npx tsx packages/cli/src/cli.ts --root ../my-app ci --strict
npx tsx packages/cli/src/cli.ts --root ../my-app report --format json --output report.json
```

## Architecture

### `packages/cli/`

Entry point: `src/cli.ts` — parses `--root <path>` flag, dispatches to subcommands.

- **`src/config.ts`** — `DevInspectConfig` types, `loadConfig()`, `saveConfig()`, `isCheckEnabled()`, `getCheckCommand()`. All other modules import from here.
- **`src/init.ts`** — Interactive project scanner. Detects package manager + tools (eslint, biome, typescript, vitest, jest, playwright, build scripts). Writes `.dev-inspect.json`.
- **`src/server/`** — Node HTTP server (no framework):
  - `index.ts` — route dispatcher, static file serving from `@dev-inspect/dashboard/dist/`, CORS, request logging
  - `helpers.ts` — `ServerContext` interface, `readJSON`, `readBody`, `setCorsHeaders`
  - `proxy.ts` — proxies `/app/*` to target app, injects inspector script into HTML responses
  - `routes/` — one file per API domain: `metrics.ts`, `annotations.ts`, `config.ts`, `components.ts`, `screenshots.ts`, `claude.ts`, `history.ts`
- **`src/collector/`** — Metrics collection:
  - `types.ts` — `MetricResult`, `Metrics`, `GitStats`, `CoverageSummary` interfaces
  - `runner.ts` — `run()` helper wrapping `execSync` with timeout
  - `checks/` — one file per check: `git.ts`, `lint.ts`, `typecheck.ts`, `tests.ts`, `coverage.ts`, `build.ts`, `deps.ts`, `bundlesize.ts`, `todos.ts`, `duplicates.ts`, `envcheck.ts`, `licenses.ts`, `complexity.ts`, `secrets.ts`, `typecoverage.ts`
  - `history.ts` — appends summarized metrics to `history.json` (max 100 entries)
  - `index.ts` — orchestrator, calls checks based on config, writes `.dev-metrics/metrics.json`, appends history
- **`src/ci.ts`** — CI mode: runs all checks, evaluates thresholds from config, exits non-zero on failure
- **`src/report.ts`** — Report generator: outputs markdown or JSON to stdout or file
- **`src/mcp/`** — MCP server:
  - `index.ts` — server setup, resource registration, stdio transport
  - `tools/` — one file per tool: `health.ts`, `quality.ts`, `blast-radius.ts`, `coverage.ts`, `compare.ts`

Route handler pattern: each route file exports a function `(req, res, url, ctx: ServerContext) => boolean` (returns true if handled).

### `packages/dashboard/`

Vite + vanilla TypeScript with a custom reactive component system. **No framework** — components are functions returning `HTMLElement`.

- **`src/core/`** — The component system:
  - `state.ts` — reactive primitives: `signal()`, `computed()`, `effect()`, `batch()` with dependency tracking
  - `dom.ts` — `h()` element creator (handles events, styles, datasets, reactive children), `text()`, `show()`, `list()`, `mount()`
  - `styles.ts` — `css` tagged template for scoped styles, `injectStyles()` for deduped `<style>` injection
- **`src/components/`** — reusable: `header.ts`, `tab-bar.ts`, `status-card.ts`, `coverage-ring.ts`, `git-info.ts`, `error-output.ts`
- **`src/tabs/`** — `metrics.ts`, `ui-health.ts`, `trends.ts`, `settings.ts`
- **`src/hooks/`** — `use-metrics.ts` (SSE), `use-config.ts`, `use-annotations.ts`, `use-history.ts`
- **`src/styles/`** — `theme.css` (CSS variables), `base.css` (global styles)

Build: `pnpm build:dashboard` → `packages/dashboard/dist/` (static HTML/CSS/JS). The CLI server serves these files.

### `packages/inspector/`

IIFE bundle injected into proxied app pages via a `<script>` tag.

- `src/index.ts` — entry, guards double-load, wires event listeners
- `src/picker.ts` — element picker (hover highlight, click select, info panel)
- `src/react-fiber.ts` — React fiber tree walking (component names, props, `_debugSource` paths)
- `src/annotations.ts` — annotation CRUD, save to server, send to Claude
- `src/toolbar.ts` — floating toolbar DOM, dragging
- `src/styles.ts` — CSS constants
- `src/utils.ts` — `getSelector()`, `getKeyStyles()`, `getRect()`, `captureElement()`

Build: `pnpm build:inspector` → `packages/inspector/dist/inspector.iife.js`. The CLI server serves this file at `/inspector.js`.

## Key Patterns

- **pnpm workspace monorepo** — packages linked via `workspace:*` protocol
- **All TypeScript, all ESM** — imports use `.js` extensions everywhere
- **CLI runs via `tsx`** — no build step needed for CLI development
- **Dashboard and inspector must be built** before the server can serve them: `pnpm build`
- **`.dev-metrics/`** — data directory in target project (gitignored): metrics JSON, annotations, screenshots, Claude prompts
- **`.dev-inspect.json`** — user config in target project (intended to be committed). Supports `thresholds` for CI gating (coverageMin, bundleSizeMaxKb, maxSecrets, etc.)
- **Component resolver** in `routes/components.ts` caches results in a `Map`, searches `components/`, `app/`, `hooks/`, `lib/`, `providers/` directories
