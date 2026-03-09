/**
 * Check: Bundle Size Analysis
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import type { MetricResult } from '../types.js'

export interface BundleSizeResult extends MetricResult {
  totalBytes?: number
  jsBytes?: number
  cssBytes?: number
  fileCount?: number
  largestFile?: { name: string; bytes: number }
}

function walkFiles(dir: string): { path: string; size: number }[] {
  const results: { path: string; size: number }[] = []
  if (!existsSync(dir)) return results
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkFiles(full))
      } else if (entry.isFile()) {
        results.push({ path: full, size: statSync(full).size })
      }
    }
  } catch {
    // permission error or similar
  }
  return results
}

export function collectBundleSize(root: string, _command: string): BundleSizeResult {
  console.log('  Analyzing bundle size...')
  const start = performance.now()

  const outputDirs = ['dist', 'build', '.next', 'out']
  let outputDir: string | null = null

  for (const dir of outputDirs) {
    const full = resolve(root, dir)
    if (existsSync(full)) {
      outputDir = full
      break
    }
  }

  if (!outputDir) {
    return {
      status: 'skipped',
      duration_ms: Math.round(performance.now() - start),
      output: 'No build output directory found (checked dist/, build/, .next/, out/)',
    }
  }

  const files = walkFiles(outputDir)
  const jsFiles = files.filter(f => /\.(js|mjs|cjs)$/.test(f.path))
  const cssFiles = files.filter(f => /\.css$/.test(f.path))

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  const jsBytes = jsFiles.reduce((sum, f) => sum + f.size, 0)
  const cssBytes = cssFiles.reduce((sum, f) => sum + f.size, 0)

  let largestFile: { name: string; bytes: number } | undefined
  if (files.length > 0) {
    const largest = files.reduce((a, b) => (a.size > b.size ? a : b))
    largestFile = { name: largest.path.replace(root + '/', ''), bytes: largest.size }
  }

  const duration_ms = Math.round(performance.now() - start)

  return {
    status: 'pass',
    duration_ms,
    output: `Total: ${(totalBytes / 1024).toFixed(1)}KB, ${files.length} files (${jsFiles.length} JS, ${cssFiles.length} CSS)`,
    totalBytes,
    jsBytes,
    cssBytes,
    fileCount: files.length,
    largestFile,
  }
}
