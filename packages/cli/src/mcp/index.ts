/**
 * MCP Server — Dev Dashboard
 * Exposes dev metrics as MCP tools for Claude Code
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { registerHealthTool } from './tools/health.js'
import { registerQualityTool } from './tools/quality.js'
import { registerBlastRadiusTool } from './tools/blast-radius.js'
import { registerCoverageTool } from './tools/coverage.js'
import { registerCompareTool } from './tools/compare.js'

export async function startMcpServer(): Promise<void> {
  const ROOT = process.env.DEV_INSPECT_ROOT ?? process.cwd()
  const METRICS_FILE = resolve(ROOT, '.dev-metrics/metrics.json')

  const server = new McpServer({
    name: 'cielo-dev-dashboard',
    version: '1.0.0',
  })

  // --- Resources ---

  server.resource('metrics', 'devdash://metrics', async (uri) => {
    let metrics = null
    if (existsSync(METRICS_FILE)) {
      metrics = JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: metrics ? JSON.stringify(metrics, null, 2) : '{"error": "No metrics collected yet. Run: pnpm --filter cielo-dev-dashboard collect"}',
        },
      ],
    }
  })

  // --- Register Tools ---

  registerHealthTool(server, ROOT)
  registerQualityTool(server, ROOT)
  registerBlastRadiusTool(server, ROOT)
  registerCoverageTool(server, ROOT)
  registerCompareTool(server, ROOT)

  // --- Start ---

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
