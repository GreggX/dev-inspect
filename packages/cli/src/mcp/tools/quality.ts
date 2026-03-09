/**
 * MCP Tool: run_quality_check
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { execSync } from 'node:child_process'
import { loadConfig, isCheckEnabled, getCheckCommand } from '../../config.js'

export function registerQualityTool(server: McpServer, root: string): void {
  const config = loadConfig(root)

  function runCommand(cmd: string): { ok: boolean; output: string } {
    try {
      const output = execSync(cmd, { cwd: root, encoding: 'utf-8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'] })
      return { ok: true, output }
    } catch (e: any) {
      return { ok: false, output: (e.stdout?.toString() ?? '') + '\n' + (e.stderr?.toString() ?? '') }
    }
  }

  server.tool(
    'run_quality_check',
    'Run a specific quality check: lint, typecheck, tests, coverage, build, bundlesize, todos, duplicates, envcheck, licenses, complexity, secrets, or typecoverage',
    { check: z.enum(['lint', 'typecheck', 'tests', 'coverage', 'build', 'bundlesize', 'todos', 'duplicates', 'envcheck', 'licenses', 'complexity', 'secrets', 'typecoverage']) },
    async ({ check }: { check: 'lint' | 'typecheck' | 'tests' | 'coverage' | 'build' | 'bundlesize' | 'todos' | 'duplicates' | 'envcheck' | 'licenses' | 'complexity' | 'secrets' | 'typecoverage' }) => {
      if (!isCheckEnabled(config, check)) {
        return { content: [{ type: 'text' as const, text: `The "${check}" check is disabled in .dev-inspect.json` }] }
      }

      const cmd = getCheckCommand(config, check)
      const result = runCommand(cmd)
      // Truncate output for large results
      const output = result.output.length > 5000 ? result.output.slice(0, 5000) + '\n... (truncated)' : result.output

      return {
        content: [
          {
            type: 'text',
            text: `## ${check} — ${result.ok ? 'PASS' : 'FAIL'}\n\n\`\`\`\n${output}\n\`\`\``,
          },
        ],
      }
    }
  )
}
