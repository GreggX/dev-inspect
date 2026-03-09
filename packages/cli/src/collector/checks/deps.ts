/**
 * Check: Dependencies (outdated + vulnerabilities)
 */

import { run } from '../runner.js'

export function collectDependencies(root: string): { outdated: number; vulnerabilities: number } {
  console.log('  Checking dependencies...')
  const outdated = run('pnpm outdated --format json 2>/dev/null || pnpm outdated', root)
  const audit = run('pnpm audit --json 2>/dev/null || echo "{}"', root)

  let outdatedCount = 0
  let vulnCount = 0

  try {
    const parsed = JSON.parse(outdated.stdout)
    outdatedCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
  } catch {
    outdatedCount = outdated.stdout.split('\n').filter((l) => l.trim() && !l.startsWith('Package')).length
  }

  try {
    const parsed = JSON.parse(audit.stdout)
    vulnCount = parsed.metadata?.vulnerabilities?.total ?? 0
  } catch {
    // ignore
  }

  return { outdated: outdatedCount, vulnerabilities: vulnCount }
}
