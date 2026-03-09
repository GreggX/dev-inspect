/**
 * Route: /api/resolve-component(s) + resolver logic + cache
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { readBody, type ServerContext } from '../helpers.js'

// --- Component Resolver: maps React component names to file paths ---

interface ResolvedComponent {
  name: string
  filePath: string | null
  lineNumber: number | null
  type: 'definition' | 'export' | 'usage'
  context: string
}

const componentCache = new Map<string, ResolvedComponent[]>()

export function resolveComponent(componentName: string, root: string): ResolvedComponent[] {
  if (componentCache.has(componentName)) return componentCache.get(componentName)!

  const results: ResolvedComponent[] = []

  // Skip internal React/Next.js components
  const internalPrefixes = [
    'InnerLayoutRouter', 'RedirectErrorBoundary', 'RedirectBoundary',
    'HTTPAccessFallbackBoundary', 'LoadingBoundary', 'ErrorBoundaryHandler',
    'ErrorBoundary', 'InnerScrollAndFocusHandler', 'ScrollAndFocusHandler',
    'RenderFromTemplateContext', 'SegmentViewNode', 'OuterLayoutRouter',
    'Suspense', 'Fragment',
  ]
  if (internalPrefixes.includes(componentName)) {
    componentCache.set(componentName, [])
    return []
  }

  const searchDirs = ['components', 'app', 'hooks', 'lib', 'providers']
  const extensions = '{ts,tsx,js,jsx}'

  // Search patterns in priority order
  const patterns = [
    // function ComponentName or const ComponentName
    `(function|const|let|export function|export const|export default function)\\s+${componentName}\\b`,
    // export { ComponentName } or export default ComponentName
    `export\\s+(default\\s+)?${componentName}\\b`,
    // displayName = 'ComponentName'
    `displayName\\s*=\\s*['"]${componentName}['"]`,
  ]

  for (const dir of searchDirs) {
    const searchPath = resolve(root, dir)
    if (!existsSync(searchPath)) continue

    for (const pattern of patterns) {
      try {
        const output = execSync(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E '${pattern}' ${searchPath} 2>/dev/null || true`,
          { cwd: root, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
        )

        for (const line of output.split('\n').filter(Boolean)) {
          const match = line.match(/^(.+?):(\d+):(.+)$/)
          if (match) {
            const absPath = match[1]
            const relPath = absPath.replace(root + '/', '')
            const lineNum = parseInt(match[2])
            const context = match[3].trim()

            // Skip test files and node_modules
            if (relPath.includes('__tests__') || relPath.includes('node_modules')) continue

            const type: 'definition' | 'export' | 'usage' =
              context.includes('export default') || context.includes('export {')
                ? 'export'
                : context.includes('function') || context.includes('const') || context.includes('let')
                  ? 'definition'
                  : 'usage'

            results.push({ name: componentName, filePath: relPath, lineNumber: lineNum, type, context })
          }
        }
      } catch {
        // grep failed, continue
      }

      if (results.length > 0) break // found matches, stop searching
    }

    if (results.length > 0) break // found in this directory
  }

  // Deduplicate by filePath
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    if (!r.filePath || seen.has(r.filePath)) return false
    seen.add(r.filePath)
    return true
  })

  componentCache.set(componentName, deduped)
  return deduped
}

function resolveComponentHierarchy(names: string[], root: string): Record<string, ResolvedComponent[]> {
  const result: Record<string, ResolvedComponent[]> = {}
  for (const name of names) {
    const resolved = resolveComponent(name, root)
    if (resolved.length > 0) {
      result[name] = resolved
    }
  }
  return result
}

export function handleComponents(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  if (url.pathname === '/api/resolve-components' && req.method === 'POST') {
    readBody(req).then((body) => {
      try {
        const { componentNames } = JSON.parse(body)
        console.log(`  ↳ Resolving ${componentNames.length} components:`, componentNames)
        const resolved = resolveComponentHierarchy(componentNames, ctx.root)
        const found = Object.keys(resolved)
        const missed = componentNames.filter((n: string) => !resolved[n])
        console.log(`  ↳ Resolved ${found.length}/${componentNames.length}:`, found.map((n: string) => `${n} → ${resolved[n][0].filePath}:${resolved[n][0].lineNumber}`))
        if (missed.length > 0) console.log(`  ↳ Unresolved:`, missed)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(resolved))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return true
  }

  if (url.pathname === '/api/resolve-component' && req.method === 'GET') {
    const name = url.searchParams.get('name')
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing name parameter' }))
      return true
    }
    const resolved = resolveComponent(name, ctx.root)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(resolved))
    return true
  }

  return false
}
