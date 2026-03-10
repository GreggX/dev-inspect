import { signal, type Signal } from '../core/state.js'

export interface CheckResult {
  status: 'pass' | 'fail' | 'skipped'
  duration_ms: number
  output?: string
  error?: string
}

export interface TestResult extends CheckResult {
  passed?: number
  failed?: number
  total?: number
}

export interface CoverageSummary {
  lines: { pct: number }
  branches: { pct: number }
  functions: { pct: number }
  statements: { pct: number }
}

export interface GitInfo {
  branch: string
  uncommitted_files: number
  files_changed: number
  insertions: number
  deletions: number
  recent_commits: string[]
}

export interface Dependencies {
  outdated: number
  vulnerabilities: number
}

export interface BundleSizeResult extends CheckResult {
  totalBytes?: number
  jsBytes?: number
  cssBytes?: number
  fileCount?: number
  largestFile?: { name: string; bytes: number }
}

export interface TodoResult extends CheckResult {
  total?: number
  breakdown?: { todo: number; fixme: number; hack: number }
  items?: { file: string; line: number; type: string; text: string }[]
}

export interface DuplicatesResult extends CheckResult {
  count?: number
  packages?: { name: string; versions: string[] }[]
}

export interface EnvCheckResult extends CheckResult {
  missing?: string[]
  extra?: string[]
}

export interface LicenseResult extends CheckResult {
  total?: number
  risk?: { name: string; license: string; level: 'high' | 'medium' | 'low' }[]
  summary?: Record<string, number>
}

export interface ComplexityResult extends CheckResult {
  totalLines?: number
  totalFiles?: number
  avgLines?: number
  largestFiles?: { file: string; lines: number }[]
  functionCount?: number
}

export interface SecretsResult extends CheckResult {
  findings?: number
  items?: { file: string; line: number; type: string }[]
}

export interface TypeCoverageResult extends CheckResult {
  anyCount?: number
  totalIdentifiers?: number
  percentage?: number
}

export interface Metrics {
  timestamp: string
  lint: CheckResult
  typecheck: CheckResult
  tests: TestResult
  build: CheckResult
  coverage?: { summary?: CoverageSummary }
  git: GitInfo
  dependencies: Dependencies
  bundlesize?: BundleSizeResult
  todos?: TodoResult
  duplicates?: DuplicatesResult
  envcheck?: EnvCheckResult
  licenses?: LicenseResult
  complexity?: ComplexityResult
  secrets?: SecretsResult
  typecoverage?: TypeCoverageResult
  testquality?: {
    status: string
    duration_ms: number
    totalTests?: number
    avgScore?: number
    weakTests?: number
    strongTests?: number
  }
}

export function useMetrics(): Signal<Metrics | null> {
  const metrics = signal<Metrics | null>(null)

  // Initial fetch
  fetch('/api/metrics')
    .then((r) => r.json())
    .then((data) => {
      if (!data.error) metrics.set(data)
    })
    .catch(() => {})

  // SSE auto-refresh
  function connectSSE() {
    const source = new EventSource('/api/metrics/stream')
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        metrics.set(data)
      } catch {}
    }
    source.onerror = () => {
      source.close()
      setTimeout(connectSSE, 5000)
    }
  }

  connectSSE()

  return metrics
}
