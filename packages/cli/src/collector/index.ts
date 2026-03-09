/**
 * Metrics Collector — orchestrator
 * Runs lint, tests, coverage, and build — outputs structured JSON to .dev-metrics/
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig, isCheckEnabled, getCheckCommand, type CheckName } from '../config.js'
import type { MetricResult, Metrics } from './types.js'
import { appendHistory } from './history.js'
import { collectGit } from './checks/git.js'
import { collectLint } from './checks/lint.js'
import { collectTypecheck } from './checks/typecheck.js'
import { collectTests } from './checks/tests.js'
import { collectCoverage } from './checks/coverage.js'
import { collectBuild } from './checks/build.js'
import { collectDependencies } from './checks/deps.js'
import { collectBundleSize } from './checks/bundlesize.js'
import { collectTodos } from './checks/todos.js'
import { collectDuplicates } from './checks/duplicates.js'
import { collectEnvCheck } from './checks/envcheck.js'
import { collectLicenses } from './checks/licenses.js'
import { collectComplexity } from './checks/complexity.js'
import { collectSecrets } from './checks/secrets.js'
import { collectTypeCoverage } from './checks/typecoverage.js'

export async function runCollector(checks: string[]): Promise<Metrics> {
  const ROOT = process.env.DEV_INSPECT_ROOT ?? process.cwd()
  const METRICS_DIR = resolve(ROOT, '.dev-metrics')
  const METRICS_FILE = resolve(METRICS_DIR, 'metrics.json')
  const config = loadConfig(ROOT)

  const runAll = checks.length === 0
  const runOnly = new Set(checks)

  function shouldRun(name: string) {
    // CLI args override everything
    if (!runAll) return runOnly.has(name)
    // Config controls what's enabled when running all
    return isCheckEnabled(config, name as CheckName)
  }

  console.log('Collecting dev metrics...\n')
  mkdirSync(METRICS_DIR, { recursive: true })

  // Load existing metrics for partial updates
  let existing: Partial<Metrics> = {}
  if (existsSync(METRICS_FILE)) {
    try {
      existing = JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
    } catch {
      // start fresh
    }
  }

  const skipped: MetricResult = { status: 'skipped', duration_ms: 0 }

  const metrics: Metrics = {
    timestamp: new Date().toISOString(),
    project: (() => {
      try { return JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')).name ?? 'unknown' }
      catch { return 'unknown' }
    })(),
    git: collectGit(ROOT),
    lint: shouldRun('lint') ? collectLint(ROOT, getCheckCommand(config, 'lint')) : (existing.lint ?? skipped),
    typecheck: shouldRun('typecheck') ? collectTypecheck(ROOT, getCheckCommand(config, 'typecheck')) : (existing.typecheck ?? skipped),
    tests: shouldRun('tests') ? collectTests(ROOT, getCheckCommand(config, 'tests')) : (existing.tests ?? { ...skipped }),
    coverage: shouldRun('coverage') ? collectCoverage(ROOT, getCheckCommand(config, 'coverage')) : (existing.coverage ?? { ...skipped }),
    build: shouldRun('build') ? collectBuild(ROOT, getCheckCommand(config, 'build')) : (existing.build ?? skipped),
    dependencies: shouldRun('deps') ? collectDependencies(ROOT) : (existing.dependencies ?? { outdated: 0, vulnerabilities: 0 }),
    bundlesize: shouldRun('bundlesize') ? collectBundleSize(ROOT, getCheckCommand(config, 'bundlesize')) : (existing.bundlesize ?? skipped),
    todos: shouldRun('todos') ? collectTodos(ROOT, getCheckCommand(config, 'todos')) : (existing.todos ?? skipped),
    duplicates: shouldRun('duplicates') ? collectDuplicates(ROOT, getCheckCommand(config, 'duplicates')) : (existing.duplicates ?? skipped),
    envcheck: shouldRun('envcheck') ? collectEnvCheck(ROOT, getCheckCommand(config, 'envcheck')) : (existing.envcheck ?? skipped),
    licenses: shouldRun('licenses') ? collectLicenses(ROOT, getCheckCommand(config, 'licenses')) : (existing.licenses ?? skipped),
    complexity: shouldRun('complexity') ? collectComplexity(ROOT, getCheckCommand(config, 'complexity')) : (existing.complexity ?? skipped),
    secrets: shouldRun('secrets') ? collectSecrets(ROOT, getCheckCommand(config, 'secrets')) : (existing.secrets ?? skipped),
    typecoverage: shouldRun('typecoverage') ? collectTypeCoverage(ROOT, getCheckCommand(config, 'typecoverage')) : (existing.typecoverage ?? skipped),
  }

  writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2))
  appendHistory(METRICS_DIR, metrics)
  console.log(`\nMetrics saved to ${METRICS_FILE}`)

  // Print summary
  console.log('\n--- Summary ---')
  console.log(`Branch:     ${metrics.git.branch}`)
  console.log(`Lint:       ${metrics.lint.status} (${metrics.lint.duration_ms}ms)`)
  console.log(`Typecheck:  ${metrics.typecheck.status} (${metrics.typecheck.duration_ms}ms)`)
  console.log(`Tests:      ${metrics.tests.status} — ${metrics.tests.passed ?? '?'}/${metrics.tests.total ?? '?'} passed (${metrics.tests.duration_ms}ms)`)
  if (metrics.coverage.summary) {
    console.log(`Coverage:   Lines ${metrics.coverage.summary.lines.pct}% | Branches ${metrics.coverage.summary.branches.pct}% | Functions ${metrics.coverage.summary.functions.pct}%`)
  }
  console.log(`Build:      ${metrics.build.status} (${metrics.build.duration_ms}ms)`)
  console.log(`Deps:       ${metrics.dependencies.outdated} outdated, ${metrics.dependencies.vulnerabilities} vulnerabilities`)
  console.log(`BundleSize: ${metrics.bundlesize.status} (${metrics.bundlesize.duration_ms}ms)`)
  console.log(`TODOs:      ${metrics.todos.status} — ${metrics.todos.total ?? '?'} items (${metrics.todos.duration_ms}ms)`)
  console.log(`Duplicates: ${metrics.duplicates.status} — ${metrics.duplicates.count ?? '?'} packages (${metrics.duplicates.duration_ms}ms)`)
  console.log(`EnvCheck:   ${metrics.envcheck.status} (${metrics.envcheck.duration_ms}ms)`)
  console.log(`Licenses:   ${metrics.licenses.status} — ${metrics.licenses.total ?? '?'} scanned (${metrics.licenses.duration_ms}ms)`)
  console.log(`Complexity: ${metrics.complexity.status} — ${metrics.complexity.totalLines ?? '?'} lines (${metrics.complexity.duration_ms}ms)`)
  console.log(`Secrets:    ${metrics.secrets.status} — ${metrics.secrets.findings ?? 0} findings (${metrics.secrets.duration_ms}ms)`)
  console.log(`TypeCov:    ${metrics.typecoverage.status} — ${metrics.typecoverage.percentage ?? '?'}% (${metrics.typecoverage.duration_ms}ms)`)

  return metrics
}
