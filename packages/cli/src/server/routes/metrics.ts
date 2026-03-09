/**
 * Route: /api/metrics, /api/metrics/stream (SSE)
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { watchFile } from 'node:fs'
import { readJSON, type ServerContext } from '../helpers.js'

export function handleMetrics(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname === '/api/metrics') {
    const metrics = readJSON(ctx.metricsFile)
    res.writeHead(metrics ? 200 : 404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(metrics ?? { error: 'No metrics collected yet' }))
    return true
  }

  if (url.pathname === '/api/metrics/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    const send = () => {
      const metrics = readJSON(ctx.metricsFile)
      if (metrics) res.write(`data: ${JSON.stringify(metrics)}\n\n`)
    }
    send()
    watchFile(ctx.metricsFile, { interval: 2000 }, send)
    req.on('close', () => {})
    return true
  }

  return false
}
