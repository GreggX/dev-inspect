/**
 * Route: /api/screenshot POST, /api/screenshots GET, /screenshots/* serving
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { readBody, type ServerContext } from '../helpers.js'

export function handleScreenshots(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  // --- Screenshot capture ---
  if (url.pathname === '/api/screenshot' && req.method === 'POST') {
    readBody(req).then((body) => {
      try {
        const data = JSON.parse(body)
        const timestamp = Date.now()
        const filename = `screenshot-${timestamp}.png`
        const filepath = resolve(ctx.screenshotsDir, filename)

        // Use Playwright CLI to capture screenshot
        const pageUrl = data.pageUrl ?? `http://${ctx.appHost}:${ctx.appPort}`
        const playwrightScript = data.type === 'element' && data.selector
          ? `const { chromium } = require('playwright');
             (async () => {
               const browser = await chromium.launch();
               const page = await browser.newPage();
               await page.goto('${pageUrl.replace(/'/g, "\\'")}');
               await page.waitForLoadState('networkidle');
               const el = await page.locator('${data.selector.replace(/'/g, "\\'")}').first();
               await el.screenshot({ path: '${filepath}' });
               await browser.close();
             })();`
          : `const { chromium } = require('playwright');
             (async () => {
               const browser = await chromium.launch();
               const page = await browser.newPage();
               await page.goto('${pageUrl.replace(/'/g, "\\'")}');
               await page.waitForLoadState('networkidle');
               await page.screenshot({ path: '${filepath}', fullPage: true });
               await browser.close();
             })();`

        try {
          execSync(`node -e "${playwrightScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
            cwd: ctx.root,
            timeout: 30_000,
            stdio: 'pipe',
          })
        } catch {
          // Fallback: just note that screenshot couldn't be taken
          writeFileSync(filepath.replace('.png', '.txt'), `Screenshot requested for ${pageUrl} at ${new Date().toISOString()}\nSelector: ${data.selector ?? 'full page'}`)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, filename, path: filepath }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return true
  }

  // --- Screenshots listing ---
  if (url.pathname === '/api/screenshots' && req.method === 'GET') {
    try {
      const files = readdirSync(ctx.screenshotsDir)
        .filter(f => f.endsWith('.png'))
        .map(f => ({
          name: f,
          url: `/screenshots/${f}`,
          time: statSync(resolve(ctx.screenshotsDir, f)).mtime.toISOString(),
        }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(files))
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('[]')
    }
    return true
  }

  // --- Serve screenshot images ---
  if (url.pathname.startsWith('/screenshots/')) {
    const filename = url.pathname.replace('/screenshots/', '')
    const filepath = resolve(ctx.screenshotsDir, filename)
    if (existsSync(filepath) && !filename.includes('..')) {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(readFileSync(filepath))
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
    return true
  }

  return false
}
