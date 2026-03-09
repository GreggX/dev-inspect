/**
 * Check: Test coverage
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MetricResult, CoverageSummary } from '../types.js'
import { run } from '../runner.js'

export function collectCoverage(root: string, command: string): MetricResult & { summary?: CoverageSummary } {
  console.log(`  Running coverage... (${command})`)
  const result = run(command, root)

  let summary: CoverageSummary | undefined
  const coverageJsonPath = resolve(root, 'coverage/coverage-summary.json')
  if (existsSync(coverageJsonPath)) {
    try {
      const coverageData = JSON.parse(readFileSync(coverageJsonPath, 'utf-8'))
      summary = coverageData.total
    } catch {
      // ignore parse errors
    }
  }

  return {
    status: summary ? 'pass' : 'fail',
    duration_ms: result.duration_ms,
    summary,
    error: result.ok ? undefined : result.stderr.slice(0, 500),
  }
}
