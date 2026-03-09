/**
 * Route: /api/config GET/POST
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readJSON, readBody, type ServerContext } from '../helpers.js'

export function handleConfig(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname !== '/api/config') return false

  if (req.method === 'GET') {
    const configData = readJSON(resolve(ctx.root, '.dev-inspect.json'))
    res.writeHead(configData ? 200 : 404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(configData ?? { error: 'No .dev-inspect.json found. Run: dev-inspect init' }))
    return true
  }

  if (req.method === 'POST') {
    readBody(req).then((body) => {
      try {
        const data = JSON.parse(body)
        if (!data.checks || typeof data.checks !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid config: must have a "checks" object' }))
          return
        }
        writeFileSync(resolve(ctx.root, '.dev-inspect.json'), JSON.stringify(data, null, 2) + '\n')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return true
  }

  return false
}
