/**
 * MCP Tool: get_project_health
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function registerHealthTool(server: McpServer, root: string): void {
  const METRICS_FILE = resolve(root, '.dev-metrics/metrics.json')

  function readMetrics() {
    if (!existsSync(METRICS_FILE)) return null
    return JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
  }

  server.tool(
    'get_project_health',
    'Get a summary of the project health: lint, tests, coverage, build status',
    {},
    async () => {
      const metrics = readMetrics()
      if (!metrics) {
        return { content: [{ type: 'text', text: 'No metrics found. Run the collector first: cd tools/dev-dashboard && pnpm collect' }] }
      }

      const age = Date.now() - new Date(metrics.timestamp).getTime()
      const ageMin = Math.round(age / 60_000)

      const lines = [
        `# Project Health (${ageMin}min ago)`,
        '',
        `| Check | Status | Duration |`,
        `|-------|--------|----------|`,
        `| Lint | ${metrics.lint.status} | ${metrics.lint.duration_ms}ms |`,
        `| Typecheck | ${metrics.typecheck.status} | ${metrics.typecheck.duration_ms}ms |`,
        `| Tests | ${metrics.tests.status} (${metrics.tests.passed ?? '?'}/${metrics.tests.total ?? '?'}) | ${metrics.tests.duration_ms}ms |`,
        `| Build | ${metrics.build.status} | ${metrics.build.duration_ms}ms |`,
        '',
        `**Branch:** ${metrics.git.branch}`,
        `**Uncommitted:** ${metrics.git.uncommitted_files} files`,
      ]

      if (metrics.coverage?.summary) {
        const c = metrics.coverage.summary
        lines.push('', '## Coverage')
        lines.push(`- Lines: ${c.lines.pct}%`)
        lines.push(`- Branches: ${c.branches.pct}%`)
        lines.push(`- Functions: ${c.functions.pct}%`)
        lines.push(`- Statements: ${c.statements.pct}%`)
      }

      // New checks
      if (metrics.bundlesize && metrics.bundlesize.status !== 'skipped') {
        lines.push(`| Bundle Size | ${metrics.bundlesize.status} | ${metrics.bundlesize.duration_ms}ms |`)
      }
      if (metrics.todos && metrics.todos.status !== 'skipped') {
        lines.push(`| TODOs | ${metrics.todos.total ?? 0} items | ${metrics.todos.duration_ms}ms |`)
      }
      if (metrics.duplicates && metrics.duplicates.status !== 'skipped') {
        lines.push(`| Duplicates | ${metrics.duplicates.count ?? 0} packages | ${metrics.duplicates.duration_ms}ms |`)
      }
      if (metrics.envcheck && metrics.envcheck.status !== 'skipped') {
        lines.push(`| Env Check | ${metrics.envcheck.status} | ${metrics.envcheck.duration_ms}ms |`)
      }
      if (metrics.licenses && metrics.licenses.status !== 'skipped') {
        lines.push(`| Licenses | ${metrics.licenses.status} (${metrics.licenses.total ?? 0} scanned) | ${metrics.licenses.duration_ms}ms |`)
      }
      if (metrics.complexity && metrics.complexity.status !== 'skipped') {
        lines.push(`| Complexity | ${metrics.complexity.totalLines ?? 0} lines, ${metrics.complexity.totalFiles ?? 0} files | ${metrics.complexity.duration_ms}ms |`)
      }
      if (metrics.secrets && metrics.secrets.status !== 'skipped') {
        lines.push(`| Secrets | ${metrics.secrets.status} (${metrics.secrets.findings ?? 0} findings) | ${metrics.secrets.duration_ms}ms |`)
      }
      if (metrics.typecoverage && metrics.typecoverage.status !== 'skipped') {
        lines.push(`| Type Coverage | ${metrics.typecoverage.percentage ?? '?'}% | ${metrics.typecoverage.duration_ms}ms |`)
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }
  )
}
