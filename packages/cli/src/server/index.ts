/**
 * Dev Dashboard — Lightweight HTTP server
 * Serves the dashboard UI, metrics API, app proxy with inspector, and Claude integration
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { createRequire } from 'node:module'
import { setCorsHeaders, type ServerContext } from './helpers.js'
import { proxyToApp } from './proxy.js'
import { handleMetrics } from './routes/metrics.js'
import { handleAnnotations } from './routes/annotations.js'
import { handleConfig } from './routes/config.js'
import { handleComponents } from './routes/components.js'
import { handleScreenshots } from './routes/screenshots.js'
import { handleClaude } from './routes/claude.js'
import { handleHistory } from './routes/history.js'
import { handleTestQuality } from './routes/testquality.js'

const require = createRequire(import.meta.url)

// Try to find the built dashboard
let DASHBOARD_DIR: string
try {
  DASHBOARD_DIR = dirname(require.resolve('@dev-inspect/dashboard/package.json'))
  DASHBOARD_DIR = resolve(DASHBOARD_DIR, 'dist')
} catch {
  DASHBOARD_DIR = '' // dashboard not built yet
}

// Try to find the inspector script
let INSPECTOR_JS_PATH: string
try {
  INSPECTOR_JS_PATH = require.resolve('@dev-inspect/inspector/dist/inspector.iife.js')
} catch {
  INSPECTOR_JS_PATH = '' // inspector not built
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

export function startServer(): void {
  const ROOT = process.env.DEV_INSPECT_ROOT ?? process.cwd()
  const PORT = parseInt(process.env.PORT ?? '4444')
  const APP_PORT = parseInt(process.env.APP_PORT ?? '3000')
  const APP_HOST = process.env.APP_HOST ?? 'localhost'
  const METRICS_FILE = resolve(ROOT, '.dev-metrics/metrics.json')
  const ANNOTATIONS_FILE = resolve(ROOT, '.dev-metrics/annotations.json')
  const SCREENSHOTS_DIR = resolve(ROOT, '.dev-metrics/screenshots')

  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  const ctx: ServerContext = {
    root: ROOT,
    port: PORT,
    appPort: APP_PORT,
    appHost: APP_HOST,
    metricsFile: METRICS_FILE,
    annotationsFile: ANNOTATIONS_FILE,
    screenshotsDir: SCREENSHOTS_DIR,
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    // CORS for all API routes
    setCorsHeaders(res)

    // Request logging
    const start = Date.now()
    const logPrefix = `[${new Date().toLocaleTimeString()}] ${req.method} ${url.pathname}`
    if (url.pathname.startsWith('/api/')) {
      console.log(`${logPrefix}`)
    }
    res.on('finish', () => {
      if (url.pathname.startsWith('/api/')) {
        console.log(`${logPrefix} → ${res.statusCode} (${Date.now() - start}ms)`)
      }
    })

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // --- Inspector JS ---
    if (url.pathname === '/inspector.js') {
      if (INSPECTOR_JS_PATH && existsSync(INSPECTOR_JS_PATH)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' })
        res.end(readFileSync(INSPECTOR_JS_PATH, 'utf-8'))
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Inspector not built yet')
      }
      return
    }

    // --- Route dispatch ---
    if (handleMetrics(req, res, url, ctx)) return
    if (handleAnnotations(req, res, url, ctx)) return
    if (handleConfig(req, res, url, ctx)) return
    if (handleComponents(req, res, url, ctx)) return
    if (handleScreenshots(req, res, url, ctx)) return
    if (handleClaude(req, res, url, ctx)) return
    if (handleHistory(req, res, url, ctx)) return
    if (handleTestQuality(req, res, url, ctx)) return

    // --- App Proxy (routes under /app/*) ---
    if (url.pathname.startsWith('/app')) {
      const targetPath = url.pathname.replace(/^\/app/, '') || '/'
      const search = url.search ?? ''
      proxyToApp(req, res, targetPath + search, ctx)
      return
    }

    // --- Serve dashboard ---
    if (DASHBOARD_DIR && existsSync(DASHBOARD_DIR)) {
      // Serve index.html for root or /index.html
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const indexPath = resolve(DASHBOARD_DIR, 'index.html')
        if (existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(readFileSync(indexPath, 'utf-8'))
          return
        }
      }

      // Serve other static files from DASHBOARD_DIR
      const filePath = resolve(DASHBOARD_DIR, url.pathname.slice(1))
      // Ensure the resolved path is within DASHBOARD_DIR (prevent path traversal)
      if (filePath.startsWith(DASHBOARD_DIR) && existsSync(filePath)) {
        const ext = extname(filePath)
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(readFileSync(filePath))
        return
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  server.listen(PORT, () => {
    console.log(`
  Dev Dashboard running at http://localhost:${PORT}

  Dashboard:  http://localhost:${PORT}
  App Proxy:  http://localhost:${PORT}/app  (proxies to localhost:${APP_PORT} + inspector)
  API:        http://localhost:${PORT}/api/metrics
  SSE:        http://localhost:${PORT}/api/metrics/stream

  Environment:
    APP_PORT=${APP_PORT}  (set APP_PORT env to change)
    PORT=${PORT}
`)
  })
}
