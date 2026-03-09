/**
 * Route: /api/send-to-claude POST
 *
 * Generates a token-efficient prompt for Claude Code using:
 * - @ file references for direct file navigation
 * - # section references for scoped context
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { readBody, type ServerContext } from '../helpers.js'
import { resolveComponent } from './components.js'

const MAX_PROMPT_LOG = 20

export function handleClaude(req: IncomingMessage, res: ServerResponse, url: URL, ctx: ServerContext): boolean {
  // GET prompt log
  if (url.pathname === '/api/prompt-log' && req.method === 'GET') {
    const logFile = resolve(ctx.root, '.dev-metrics/prompt-log.json')
    const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf-8')) : []
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(log))
    return true
  }

  if (url.pathname !== '/api/send-to-claude' || req.method !== 'POST') return false

  readBody(req).then((body) => {
    try {
      const data = JSON.parse(body)
      const { annotations, pageUrl, pageTitle } = data

      const prompt = buildPrompt(annotations, pageUrl, pageTitle, ctx)

      // Save prompt to file for Claude CLI
      const promptFile = resolve(ctx.root, '.dev-metrics/claude-prompt.md')
      writeFileSync(promptFile, prompt)

      // Append to prompt log
      const logFile = resolve(ctx.root, '.dev-metrics/prompt-log.json')
      let log: any[] = []
      if (existsSync(logFile)) {
        try { log = JSON.parse(readFileSync(logFile, 'utf-8')) } catch { log = [] }
      }
      log.push({
        timestamp: new Date().toISOString(),
        annotationCount: annotations.length,
        pageUrl,
        pageTitle,
        prompt,
      })
      if (log.length > MAX_PROMPT_LOG) log = log.slice(-MAX_PROMPT_LOG)
      writeFileSync(logFile, JSON.stringify(log, null, 2))

      // Also try to copy to clipboard
      try {
        execSync(`echo ${JSON.stringify(prompt)} | pbcopy`, { stdio: 'pipe' })
      } catch {
        // clipboard copy is optional
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        promptFile,
        prompt,
        hint: `Run: cat .dev-metrics/claude-prompt.md | claude`,
      }))
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid request' }))
    }
  })
  return true
}

function buildPrompt(
  annotations: any[],
  pageUrl: string,
  pageTitle: string,
  ctx: ServerContext,
): string {
  const lines: string[] = []

  // --- Header: concise task description ---
  lines.push(`# Styling fixes for ${pageTitle || pageUrl}`)
  lines.push('')

  // --- Collect all unique file paths for @ references ---
  const fileRefs = new Set<string>()

  // --- Annotations ---
  lines.push('## Changes')
  lines.push('')

  for (const a of annotations) {
    let filePath = a.filePath
    let lineNumber = a.lineNumber
    const hierarchy = a.componentHierarchy || []

    // Resolve component to file if needed
    if (!filePath && a.component) {
      const resolved = resolveComponent(a.component, ctx.root)
      if (resolved.length > 0) {
        filePath = resolved[0].filePath
        lineNumber = resolved[0].lineNumber
      }
    }

    // Resolve hierarchy entries
    for (const entry of hierarchy) {
      if (!entry.filePath && entry.name) {
        const resolved = resolveComponent(entry.name, ctx.root)
        if (resolved.length > 0) {
          entry.filePath = resolved[0].filePath
          entry.lineNumber = resolved[0].lineNumber
        }
      }
    }

    // Title line with @ file reference
    const componentLabel = a.component || a.tag
    if (filePath) {
      const fileRef = `@${filePath}${lineNumber ? ':' + lineNumber : ''}`
      fileRefs.add(filePath)
      lines.push(`### ${componentLabel} → ${fileRef}`)
    } else {
      lines.push(`### ${componentLabel} — \`${a.selector}\``)
    }

    // Owner component (if different from target)
    const nearestUser = a.nearestUserComponent?.filePath
      ? a.nearestUserComponent
      : hierarchy.find((c: { name: string; filePath?: string }) => c.filePath && c.name !== a.component)
    if (nearestUser && nearestUser.name !== a.component && nearestUser.filePath) {
      fileRefs.add(nearestUser.filePath)
      lines.push(`Owner: @${nearestUser.filePath}${nearestUser.lineNumber ? ':' + nearestUser.lineNumber : ''} #${nearestUser.name}`)
    }

    // Project-level component tree (compact format)
    const userComponents = hierarchy.filter(
      (c: { filePath?: string }) => c.filePath && !c.filePath.includes('node_modules')
    )
    if (userComponents.length > 1) {
      const tree = userComponents.map((c: { name: string; filePath: string }) => {
        fileRefs.add(c.filePath)
        return c.name
      }).join(' → ')
      lines.push(`Tree: ${tree}`)
    }

    // Compact metadata
    const meta: string[] = []
    if (a.classes?.length) meta.push(`class="${a.classes.join(' ')}"`)
    if (a.props && Object.keys(a.props).length > 0) {
      const propStr = Object.entries(a.props)
        .slice(0, 5) // limit to avoid token bloat
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
      meta.push(propStr)
    }
    if (meta.length) lines.push(`\`${meta.join(' ')}\``)

    // Current styles (compact)
    if (a.styles && Object.keys(a.styles).length > 0) {
      const styleStr = Object.entries(a.styles)
        .map(([k, v]) => `${k}:${v}`)
        .join('; ')
      lines.push(`Current: \`${styleStr}\``)
    }

    // The actual change request
    lines.push(`**→ ${a.comment}**`)
    lines.push('')
  }

  // --- Instructions (token-efficient) ---
  lines.push('---')
  lines.push('## Instructions')
  lines.push('- Use `@file:line` paths above to locate components')
  lines.push('- If target is a shared/primitive component, modify the usage site (owner) instead')
  lines.push('- Styling only — no logic changes')

  if (fileRefs.size > 0) {
    lines.push('')
    lines.push('Files to review: ' + [...fileRefs].map(f => `@${f}`).join(' '))
  }

  return lines.join('\n')
}
