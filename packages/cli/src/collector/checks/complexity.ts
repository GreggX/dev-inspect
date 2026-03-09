/**
 * Check: Code Complexity
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface ComplexityResult extends MetricResult {
  totalLines?: number
  totalFiles?: number
  avgLines?: number
  largestFiles?: { file: string; lines: number }[]
  functionCount?: number
}

export function collectComplexity(root: string, _command: string): ComplexityResult {
  console.log('  Analyzing code complexity...')
  const start = performance.now()

  // Find all source files and count lines
  const findCmd = [
    'find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" \\)',
    '-not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*"',
    '-not -path "*/.next/*" -not -path "*/coverage/*" -not -path "*/.git/*"',
    '-exec wc -l {} +',
  ].join(' ')

  const result = run(findCmd, root)
  const duration_ms = Math.round(performance.now() - start)

  if (!result.stdout.trim()) {
    return {
      status: 'skipped',
      duration_ms,
      output: 'No source files found',
    }
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  const fileEntries: { file: string; lines: number }[] = []
  let totalLines = 0

  for (const line of lines) {
    const match = line.trim().match(/^\s*(\d+)\s+(.+)$/)
    if (!match) continue
    const [, count, file] = match
    const lineCount = parseInt(count, 10)

    if (file === 'total') {
      totalLines = lineCount
    } else {
      fileEntries.push({ file: file.replace(/^\.\//, ''), lines: lineCount })
    }
  }

  // If only one file, there's no "total" line
  if (totalLines === 0 && fileEntries.length > 0) {
    totalLines = fileEntries.reduce((sum, f) => sum + f.lines, 0)
  }

  const totalFiles = fileEntries.length
  const avgLines = totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0

  // Get largest files (top 10)
  const largestFiles = [...fileEntries]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)

  // Count functions
  const fnCmd = [
    'grep -r -c -E "(function\\s+\\w|=>|def\\s+\\w)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py"',
    '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=coverage',
    '. 2>/dev/null || echo "0"',
  ].join(' ')

  const fnResult = run(fnCmd, root)
  let functionCount = 0

  for (const line of (fnResult.stdout || '').split('\n')) {
    const match = line.match(/:(\d+)$/)
    if (match) functionCount += parseInt(match[1], 10)
  }

  return {
    status: 'pass',
    duration_ms,
    output: `${totalFiles} files, ${totalLines} lines, ~${functionCount} functions, avg ${avgLines} lines/file`,
    totalLines,
    totalFiles,
    avgLines,
    largestFiles,
    functionCount,
  }
}
