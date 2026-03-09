/**
 * CI mode — runs all enabled checks and exits non-zero if any fail or thresholds are breached.
 *
 * Usage:
 *   dev-inspect ci              — run all enabled checks, fail on errors
 *   dev-inspect ci --strict     — also fail on warnings (secrets > 0, todos > max, etc.)
 */

import { loadConfig, type ThresholdsConfig } from './config.js'
import { runCollector } from './collector/index.js'
import type { Metrics } from './collector/types.js'

interface CiOptions {
  strict: boolean
}

interface Violation {
  check: string
  message: string
  severity: 'error' | 'warning'
}

function checkThresholds(metrics: Metrics, thresholds: ThresholdsConfig, strict: boolean): Violation[] {
  const violations: Violation[] = []

  // Coverage minimum
  if (thresholds.coverageMin != null && metrics.coverage?.summary) {
    const linesCov = metrics.coverage.summary.lines.pct
    if (linesCov < thresholds.coverageMin) {
      violations.push({
        check: 'coverage',
        message: `Line coverage ${linesCov}% is below minimum ${thresholds.coverageMin}%`,
        severity: 'error',
      })
    }
  }

  // Bundle size max
  if (thresholds.bundleSizeMaxKb != null && metrics.bundlesize?.totalBytes != null) {
    const sizeKb = Math.round(metrics.bundlesize.totalBytes / 1024)
    if (sizeKb > thresholds.bundleSizeMaxKb) {
      violations.push({
        check: 'bundlesize',
        message: `Bundle size ${sizeKb}KB exceeds limit ${thresholds.bundleSizeMaxKb}KB`,
        severity: 'error',
      })
    }
  }

  // Secrets
  if (thresholds.maxSecrets != null && metrics.secrets?.findings != null) {
    if (metrics.secrets.findings > thresholds.maxSecrets) {
      violations.push({
        check: 'secrets',
        message: `${metrics.secrets.findings} secret(s) found (max: ${thresholds.maxSecrets})`,
        severity: 'error',
      })
    }
  }

  // TODOs
  if (thresholds.maxTodos != null && metrics.todos?.total != null) {
    if (metrics.todos.total > thresholds.maxTodos) {
      violations.push({
        check: 'todos',
        message: `${metrics.todos.total} TODOs found (max: ${thresholds.maxTodos})`,
        severity: strict ? 'error' : 'warning',
      })
    }
  }

  // Duplicate deps
  if (thresholds.maxDuplicateDeps != null && metrics.duplicates?.count != null) {
    if (metrics.duplicates.count > thresholds.maxDuplicateDeps) {
      violations.push({
        check: 'duplicates',
        message: `${metrics.duplicates.count} duplicate deps (max: ${thresholds.maxDuplicateDeps})`,
        severity: strict ? 'error' : 'warning',
      })
    }
  }

  // High-risk licenses
  if (thresholds.maxHighRiskLicenses != null && metrics.licenses?.risk) {
    const highRisk = metrics.licenses.risk.filter(r => r.level === 'high').length
    if (highRisk > thresholds.maxHighRiskLicenses) {
      violations.push({
        check: 'licenses',
        message: `${highRisk} high-risk license(s) (max: ${thresholds.maxHighRiskLicenses})`,
        severity: 'error',
      })
    }
  }

  return violations
}

export async function runCi(options: CiOptions): Promise<void> {
  const ROOT = process.env.DEV_INSPECT_ROOT ?? process.cwd()
  const config = loadConfig(ROOT)
  const thresholds = config?.thresholds ?? {}

  console.log('Running dev-inspect CI checks...\n')

  const metrics = await runCollector([])

  // Check for failed checks
  const failures: string[] = []
  const checkFields = ['lint', 'typecheck', 'tests', 'build'] as const
  for (const field of checkFields) {
    if (metrics[field].status === 'fail') {
      failures.push(`${field}: FAILED`)
    }
  }

  // Check thresholds
  const violations = checkThresholds(metrics, thresholds, options.strict)
  const errors = violations.filter(v => v.severity === 'error')
  const warnings = violations.filter(v => v.severity === 'warning')

  // Output results
  console.log('\n' + '='.repeat(50))
  console.log('CI RESULTS')
  console.log('='.repeat(50))

  if (failures.length > 0) {
    console.log('\nFailed checks:')
    for (const f of failures) {
      console.log(`  ✗ ${f}`)
    }
  }

  if (errors.length > 0) {
    console.log('\nThreshold violations:')
    for (const v of errors) {
      console.log(`  ✗ [${v.check}] ${v.message}`)
    }
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:')
    for (const v of warnings) {
      console.log(`  ! [${v.check}] ${v.message}`)
    }
  }

  const totalErrors = failures.length + errors.length
  if (totalErrors === 0 && warnings.length === 0) {
    console.log('\nAll checks passed.')
  }

  console.log('')

  if (totalErrors > 0) {
    console.log(`CI failed with ${totalErrors} error(s).`)
    process.exit(1)
  }

  if (warnings.length > 0 && options.strict) {
    console.log(`CI failed in strict mode with ${warnings.length} warning(s).`)
    process.exit(1)
  }

  console.log('CI passed.')
}
