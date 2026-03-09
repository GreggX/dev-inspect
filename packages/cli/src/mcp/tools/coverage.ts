/**
 * MCP Tool: get_test_coverage_detail
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function registerCoverageTool(server: McpServer, root: string): void {
  server.tool(
    'get_test_coverage_detail',
    'Get detailed test coverage breakdown by file',
    { path_filter: z.string().optional() },
    async ({ path_filter }: { path_filter?: string }) => {
      const coveragePath = resolve(root, 'coverage/coverage-summary.json')
      if (!existsSync(coveragePath)) {
        return { content: [{ type: 'text', text: 'No coverage data found. Run: pnpm test:coverage' }] }
      }

      const data = JSON.parse(readFileSync(coveragePath, 'utf-8'))
      const entries = Object.entries(data).filter(([key]) => {
        if (key === 'total') return false
        if (path_filter) return key.includes(path_filter)
        return true
      })

      const lines = entries
        .map(([file, stats]: [string, any]) => {
          const rel = file.replace(root + '/', '')
          return `| ${rel} | ${stats.lines.pct}% | ${stats.branches.pct}% | ${stats.functions.pct}% |`
        })
        .slice(0, 50)

      const total = data.total
      return {
        content: [
          {
            type: 'text',
            text: [
              '## Test Coverage',
              '',
              `**Overall:** Lines ${total.lines.pct}% | Branches ${total.branches.pct}% | Functions ${total.functions.pct}%`,
              '',
              '| File | Lines | Branches | Functions |',
              '|------|-------|----------|-----------|',
              ...lines,
              entries.length > 50 ? `\n... and ${entries.length - 50} more files` : '',
            ].join('\n'),
          },
        ],
      }
    }
  )
}
