/**
 * Proxy — Forward requests to the app and inject inspector script
 */

import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import type { ServerContext } from './helpers.js'

export function proxyToApp(req: IncomingMessage, res: ServerResponse, targetPath: string, ctx: ServerContext): void {
  const options = {
    hostname: ctx.appHost,
    port: ctx.appPort,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `${ctx.appHost}:${ctx.appPort}` },
  }

  const proxyReq = httpRequest(options, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] ?? ''
    const isHtml = contentType.includes('text/html')

    if (isHtml) {
      // Collect HTML response to inject inspector script
      let body = ''
      proxyRes.on('data', (chunk: Buffer) => {
        body += chunk.toString()
      })
      proxyRes.on('end', () => {
        const inspectorScript = `
<script>window.__DASHBOARD_ORIGIN = 'http://localhost:${ctx.port}';</script>
<script src="http://localhost:${ctx.port}/inspector.js"></script>`

        // Inject before </body> or at the end
        if (body.includes('</body>')) {
          body = body.replace('</body>', inspectorScript + '\n</body>')
        } else {
          body += inspectorScript
        }

        // Remove content-length since we modified the body
        const headers = { ...proxyRes.headers }
        delete headers['content-length']
        delete headers['content-encoding'] // Remove compression since we decoded
        res.writeHead(proxyRes.statusCode ?? 200, headers)
        res.end(body)
      })
    } else {
      // Pass through non-HTML responses
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
    }
  })

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `Cannot reach app at ${ctx.appHost}:${ctx.appPort}`, detail: err.message }))
  })

  // Forward request body for POST/PUT
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq, { end: true })
  } else {
    proxyReq.end()
  }
}
