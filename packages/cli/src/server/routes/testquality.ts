/**
 * Route: /api/testquality
 * Serves the test quality analysis data from .dev-metrics/metrics.json
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readJSON, type ServerContext } from '../helpers.js'

export function handleTestQuality(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname !== '/api/testquality') return false

  const metrics = readJSON(ctx.metricsFile)
  if (!metrics?.testquality) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'No test quality data. Run: pnpm collect testquality' }))
    return true
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(metrics.testquality))
  return true
}
