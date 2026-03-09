/**
 * Check: Build
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export function collectBuild(root: string, command: string): MetricResult {
  console.log(`  Running build... (${command})`)
  const result = run(command, root)
  return {
    status: result.ok ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    output: result.ok ? 'Build successful' : undefined,
    error: result.ok ? undefined : result.stderr.slice(0, 500),
  }
}
