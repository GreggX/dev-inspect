/**
 * History tracking — appends metrics snapshots for trend analysis
 * Keeps the last 100 entries to prevent unbounded growth.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Metrics } from './types.js'

const MAX_HISTORY = 100

export interface HistoryEntry {
  timestamp: string
  project: string
  git: { branch: string; uncommitted_files: number }
  lint: { status: string }
  typecheck: { status: string }
  tests: { status: string; passed?: number; failed?: number; total?: number }
  coverage?: { lines?: number; branches?: number; functions?: number }
  build: { status: string }
  bundlesize?: { totalBytes?: number }
  todos?: { total?: number }
  secrets?: { findings?: number }
  typecoverage?: { percentage?: number }
  dependencies?: { outdated: number; vulnerabilities: number }
}

function summarize(metrics: Metrics): HistoryEntry {
  return {
    timestamp: metrics.timestamp,
    project: metrics.project,
    git: { branch: metrics.git.branch, uncommitted_files: metrics.git.uncommitted_files },
    lint: { status: metrics.lint.status },
    typecheck: { status: metrics.typecheck.status },
    tests: {
      status: metrics.tests.status,
      passed: metrics.tests.passed,
      failed: metrics.tests.failed,
      total: metrics.tests.total,
    },
    coverage: metrics.coverage?.summary ? {
      lines: metrics.coverage.summary.lines.pct,
      branches: metrics.coverage.summary.branches.pct,
      functions: metrics.coverage.summary.functions.pct,
    } : undefined,
    build: { status: metrics.build.status },
    bundlesize: metrics.bundlesize?.totalBytes != null ? { totalBytes: metrics.bundlesize.totalBytes } : undefined,
    todos: metrics.todos?.total != null ? { total: metrics.todos.total } : undefined,
    secrets: metrics.secrets?.findings != null ? { findings: metrics.secrets.findings } : undefined,
    typecoverage: metrics.typecoverage?.percentage != null ? { percentage: metrics.typecoverage.percentage } : undefined,
    dependencies: metrics.dependencies,
  }
}

export function appendHistory(metricsDir: string, metrics: Metrics): void {
  const historyFile = resolve(metricsDir, 'history.json')
  let history: HistoryEntry[] = []

  if (existsSync(historyFile)) {
    try {
      history = JSON.parse(readFileSync(historyFile, 'utf-8'))
    } catch {
      history = []
    }
  }

  history.push(summarize(metrics))

  // Trim to last MAX_HISTORY entries
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY)
  }

  writeFileSync(historyFile, JSON.stringify(history, null, 2))
}

export function readHistory(metricsDir: string): HistoryEntry[] {
  const historyFile = resolve(metricsDir, 'history.json')
  if (!existsSync(historyFile)) return []
  try {
    return JSON.parse(readFileSync(historyFile, 'utf-8'))
  } catch {
    return []
  }
}
