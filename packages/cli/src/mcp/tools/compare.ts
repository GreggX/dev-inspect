/**
 * MCP Tool: compare_before_after
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function registerCompareTool(server: McpServer, root: string): void {
  const METRICS_FILE = resolve(root, '.dev-metrics/metrics.json')

  function readMetrics() {
    if (!existsSync(METRICS_FILE)) return null
    return JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
  }

  server.tool(
    'compare_before_after',
    'Compare metrics before and after changes — useful for validating AI edits did not introduce regressions',
    {},
    async () => {
      const historyPath = resolve(root, '.dev-metrics/history.json')
      const current = readMetrics()

      if (!current) {
        return { content: [{ type: 'text', text: 'No current metrics. Run the collector first.' }] }
      }
      if (!existsSync(historyPath)) {
        return { content: [{ type: 'text', text: 'No historical metrics to compare. Run `dev-inspect collect` at least twice — history is saved automatically after each run.' }] }
      }

      const history = JSON.parse(readFileSync(historyPath, 'utf-8'))
      // Compare current against the second-to-last entry (last entry IS the current run)
      const previous = history.length >= 2 ? history[history.length - 2] : history[history.length - 1]
      if (!previous) {
        return { content: [{ type: 'text', text: 'No previous metrics to compare against.' }] }
      }

      const comparisons = []

      // Tests
      if (current.tests.total !== undefined && previous.tests?.total !== undefined) {
        const diff = (current.tests.passed ?? 0) - (previous.tests.passed ?? 0)
        comparisons.push(`Tests: ${previous.tests.passed}/${previous.tests.total} -> ${current.tests.passed}/${current.tests.total} (${diff >= 0 ? '+' : ''}${diff})`)
      }

      // Coverage
      if (current.coverage?.summary && previous.coverage?.summary) {
        const diff = current.coverage.summary.lines.pct - previous.coverage.summary.lines.pct
        comparisons.push(`Coverage (lines): ${previous.coverage.summary.lines.pct}% -> ${current.coverage.summary.lines.pct}% (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)`)
      }

      // Lint/Build status changes
      for (const check of ['lint', 'typecheck', 'build'] as const) {
        if (previous[check] && current[check]) {
          const changed = previous[check].status !== current[check].status
          if (changed) {
            comparisons.push(`${check}: ${previous[check].status} -> ${current[check].status} ${current[check].status === 'fail' ? '!!!' : ''}`)
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: [
              '## Before/After Comparison',
              '',
              `Previous: ${previous.timestamp}`,
              `Current:  ${current.timestamp}`,
              '',
              comparisons.length ? comparisons.join('\n') : 'No significant changes detected.',
            ].join('\n'),
          },
        ],
      }
    }
  )
}
