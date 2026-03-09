/**
 * MCP Tool: get_blast_radius
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { execSync } from 'node:child_process'

export function registerBlastRadiusTool(server: McpServer, root: string): void {
  function runCommand(cmd: string): { ok: boolean; output: string } {
    try {
      const output = execSync(cmd, { cwd: root, encoding: 'utf-8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'] })
      return { ok: true, output }
    } catch (e: any) {
      return { ok: false, output: (e.stdout?.toString() ?? '') + '\n' + (e.stderr?.toString() ?? '') }
    }
  }

  server.tool(
    'get_blast_radius',
    'Analyze the blast radius of current uncommitted changes — which files changed and their risk level',
    {},
    async () => {
      const diffFiles = runCommand('git diff --name-only HEAD')
      const stagedFiles = runCommand('git diff --name-only --cached')
      const untrackedFiles = runCommand('git ls-files --others --exclude-standard')

      const allFiles = [
        ...new Set([
          ...diffFiles.output.split('\n').filter(Boolean),
          ...stagedFiles.output.split('\n').filter(Boolean),
          ...untrackedFiles.output.split('\n').filter(Boolean),
        ]),
      ]

      const riskZones: Record<string, string> = {
        'lib/db/schema.ts': 'CRITICAL — database schema',
        'lib/auth/': 'HIGH — authentication/authorization',
        'lib/services/': 'HIGH — business logic',
        'lib/di/': 'HIGH — dependency injection',
        'app/api/': 'MEDIUM — API routes',
        'lib/actions/': 'MEDIUM — server actions',
        'components/': 'LOW — UI components',
        'hooks/': 'LOW — React hooks',
        '__tests__/': 'SAFE — test files',
      }

      const categorized = allFiles.map((file) => {
        let risk = 'LOW'
        for (const [pattern, riskLevel] of Object.entries(riskZones)) {
          if (file.includes(pattern) || file.startsWith(pattern)) {
            risk = riskLevel
            break
          }
        }
        return `- \`${file}\` — ${risk}`
      })

      const diffStat = runCommand('git diff --stat HEAD')

      return {
        content: [
          {
            type: 'text',
            text: [
              `## Blast Radius Analysis`,
              '',
              `**${allFiles.length} files affected**`,
              '',
              '### Files by Risk',
              ...categorized,
              '',
              '### Diff Stats',
              '```',
              diffStat.output.trim(),
              '```',
            ].join('\n'),
          },
        ],
      }
    }
  )
}
