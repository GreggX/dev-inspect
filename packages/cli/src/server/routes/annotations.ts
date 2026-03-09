/**
 * Route: /api/annotations GET/POST
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileSync } from 'node:fs'
import { readJSON, readBody, type ServerContext } from '../helpers.js'

export function handleAnnotations(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname !== '/api/annotations') return false

  if (req.method === 'POST') {
    readBody(req).then((body) => {
      try {
        const data = JSON.parse(body)
        writeFileSync(ctx.annotationsFile, JSON.stringify(data, null, 2))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return true
  }

  if (req.method === 'GET') {
    const data = readJSON(ctx.annotationsFile)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data ?? { annotations: [] }))
    return true
  }

  return false
}
