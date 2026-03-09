/**
 * Check: TODO/FIXME/HACK Scanner
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface TodoResult extends MetricResult {
  total?: number
  breakdown?: { todo: number; fixme: number; hack: number }
  items?: { file: string; line: number; type: string; text: string }[]
}

export function collectTodos(root: string, _command: string): TodoResult {
  console.log('  Scanning for TODOs/FIXMEs...')
  const start = performance.now()

  const grepCmd = [
    'grep -rn',
    '--include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py"',
    '-E "(TODO|FIXME|HACK|XXX)(\\s|:)"',
    '.',
    '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=coverage --exclude-dir=.git',
  ].join(' ')

  const result = run(grepCmd, root)
  const duration_ms = Math.round(performance.now() - start)

  const lines = (result.stdout || '').split('\n').filter(l => l.trim())

  const breakdown = { todo: 0, fixme: 0, hack: 0 }
  const items: TodoResult['items'] = []

  for (const line of lines) {
    // Format: ./path/to/file.ts:42:  // TODO: something
    const match = line.match(/^\.?\/?(.+?):(\d+):(.*)$/)
    if (!match) continue

    const [, file, lineNum, text] = match
    const upper = text.toUpperCase()

    let type = 'todo'
    if (upper.includes('FIXME')) { type = 'fixme'; breakdown.fixme++ }
    else if (upper.includes('HACK') || upper.includes('XXX')) { type = 'hack'; breakdown.hack++ }
    else { breakdown.todo++ }

    if (items.length < 50) {
      items.push({ file, line: parseInt(lineNum, 10), type, text: text.trim().slice(0, 200) })
    }
  }

  const total = breakdown.todo + breakdown.fixme + breakdown.hack

  return {
    status: total > 0 ? 'pass' : 'pass',
    duration_ms,
    output: `Found ${total} items: ${breakdown.todo} TODOs, ${breakdown.fixme} FIXMEs, ${breakdown.hack} HACKs`,
    total,
    breakdown,
    items,
  }
}
