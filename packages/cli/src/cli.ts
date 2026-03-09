#!/usr/bin/env node

/**
 * dev-inspect CLI
 * Usage:
 *   dev-inspect                           — start dashboard server
 *   dev-inspect init                      — scan project and create .dev-inspect.json
 *   dev-inspect collect                   — run enabled checks
 *   dev-inspect collect lint typecheck    — run specific checks only
 *   dev-inspect ci                        — run checks + fail on errors/thresholds
 *   dev-inspect ci --strict               — also fail on warnings
 *   dev-inspect report                    — generate markdown report to stdout
 *   dev-inspect report --format json      — JSON output
 *   dev-inspect report --output report.md — write to file
 *   dev-inspect mcp                       — start MCP server (for Claude Code)
 *
 * Flags:
 *   --root <path>   — target a different project directory (default: cwd)
 *   --yes / -y      — accept defaults without prompting (for init)
 */

import { resolve } from 'node:path'

// Parse --root flag from anywhere in argv
const rawArgs = process.argv.slice(2)
let rootPath = process.cwd()
const rootIdx = rawArgs.indexOf('--root')
if (rootIdx !== -1 && rawArgs[rootIdx + 1]) {
  rootPath = resolve(rawArgs[rootIdx + 1])
  rawArgs.splice(rootIdx, 2)
}

process.env.DEV_INSPECT_ROOT = rootPath

const command = rawArgs[0] ?? 'server'

async function main() {
  switch (command) {
    case 'init': {
      const { runInit } = await import('./init.js')
      await runInit()
      break
    }
    case 'collect': {
      // Pass remaining args as check names
      const checks = rawArgs.slice(1).filter(a => !a.startsWith('--'))
      const { runCollector } = await import('./collector/index.js')
      await runCollector(checks)
      break
    }
    case 'ci': {
      const strict = rawArgs.includes('--strict')
      const { runCi } = await import('./ci.js')
      await runCi({ strict })
      break
    }
    case 'report': {
      const fmtIdx = rawArgs.indexOf('--format')
      const format = (fmtIdx !== -1 && rawArgs[fmtIdx + 1] === 'json') ? 'json' as const : 'md' as const
      const outIdx = rawArgs.indexOf('--output')
      const output = outIdx !== -1 ? rawArgs[outIdx + 1] : undefined
      const { runReport } = await import('./report.js')
      await runReport({ format, output })
      break
    }
    case 'mcp': {
      const { startMcpServer } = await import('./mcp/index.js')
      await startMcpServer()
      break
    }
    case 'server':
    default: {
      const { startServer } = await import('./server/index.js')
      startServer()
      break
    }
  }
}

main().catch((err) => {
  console.error('dev-inspect error:', err.message)
  process.exit(1)
})
