/**
 * Check: Test runner
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export function collectTests(root: string, command: string): MetricResult & { total?: number; passed?: number; failed?: number } {
  console.log(`  Running tests... (${command})`)
  const result = run(command, root)

  let total: number | undefined
  let passed: number | undefined
  let failed: number | undefined

  try {
    const json = JSON.parse(result.stdout)
    total = json.numTotalTests
    passed = json.numPassedTests
    failed = json.numFailedTests
  } catch {
    // Try to parse from text output
    const match = result.stdout.match(/Tests\s+(\d+)\s+passed[\s\S]*?(\d+)\s+total/)
    if (match) {
      passed = parseInt(match[1])
      total = parseInt(match[2])
      failed = (total ?? 0) - (passed ?? 0)
    }
  }

  return {
    status: result.ok ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    total,
    passed,
    failed,
    error: result.ok ? undefined : result.stderr.slice(0, 500),
  }
}
