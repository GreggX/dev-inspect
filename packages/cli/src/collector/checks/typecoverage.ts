/**
 * Check: Type Coverage
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface TypeCoverageResult extends MetricResult {
  anyCount?: number
  totalIdentifiers?: number
  percentage?: number
}

export function collectTypeCoverage(root: string, _command: string): TypeCoverageResult {
  console.log('  Analyzing type coverage...')
  const start = performance.now()

  // Count `any` usage
  const anyCmd = [
    'grep -rn -E ":\\s*any\\b" --include="*.ts" --include="*.tsx"',
    '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next',
    '--exclude-dir=coverage --exclude-dir=.git',
    '. 2>/dev/null | wc -l',
  ].join(' ')

  // Count total type annotations (: SomeType patterns)
  const totalCmd = [
    'grep -rn -E ":\\s*[A-Z][a-zA-Z0-9]*|:\\s*any\\b|:\\s*string\\b|:\\s*number\\b|:\\s*boolean\\b|:\\s*void\\b|:\\s*null\\b|:\\s*undefined\\b|:\\s*never\\b|:\\s*unknown\\b|:\\s*object\\b" --include="*.ts" --include="*.tsx"',
    '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next',
    '--exclude-dir=coverage --exclude-dir=.git',
    '. 2>/dev/null | wc -l',
  ].join(' ')

  const anyResult = run(anyCmd, root)
  const totalResult = run(totalCmd, root)
  const duration_ms = Math.round(performance.now() - start)

  const anyCount = parseInt((anyResult.stdout || '0').trim(), 10) || 0
  const totalIdentifiers = parseInt((totalResult.stdout || '0').trim(), 10) || 0

  let percentage = 100
  if (totalIdentifiers > 0) {
    // Type coverage = non-any / total
    percentage = Math.round(((totalIdentifiers - anyCount) / totalIdentifiers) * 10000) / 100
  }

  return {
    status: 'pass',
    duration_ms,
    output: `Type coverage: ${percentage}% (${anyCount} \`any\` usages out of ${totalIdentifiers} type annotations)`,
    anyCount,
    totalIdentifiers,
    percentage,
  }
}
