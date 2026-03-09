/**
 * Route: /api/history
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { readJSON, type ServerContext } from '../helpers.js'

export function handleHistory(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname !== '/api/history' || req.method !== 'GET') return false

  const historyFile = resolve(ctx.root, '.dev-metrics/history.json')
  const history = readJSON(historyFile) ?? []

  // Optional limit param
  const limit = parseInt(url.searchParams.get('limit') ?? '50')
  const data = history.slice(-limit)

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
  return true
}
