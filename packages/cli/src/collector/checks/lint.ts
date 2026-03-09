/**
 * Check: Lint
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export function collectLint(root: string, command: string): MetricResult {
  console.log(`  Running lint... (${command})`)
  const result = run(command, root)
  let errorCount = 0
  let warningCount = 0
  try {
    const json = JSON.parse(result.stdout)
    for (const file of json) {
      errorCount += file.errorCount ?? 0
      warningCount += file.warningCount ?? 0
    }
  } catch {
    // fallback: just use pass/fail
  }
  return {
    status: result.ok ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    output: errorCount || warningCount ? `${errorCount} errors, ${warningCount} warnings` : undefined,
    error: result.ok ? undefined : result.stderr.slice(0, 500),
  }
}
