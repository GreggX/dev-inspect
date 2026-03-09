/**
 * Check: TypeScript type checking
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export function collectTypecheck(root: string, command: string): MetricResult {
  console.log(`  Running typecheck... (${command})`)
  const result = run(command, root)
  const errorLines = result.stdout.split('\n').filter((l) => l.includes('error TS'))
  return {
    status: result.ok ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    output: errorLines.length ? `${errorLines.length} type errors` : undefined,
    error: result.ok ? undefined : errorLines.slice(0, 10).join('\n'),
  }
}
