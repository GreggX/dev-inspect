/**
 * Collector types — shared interfaces for metric collection
 */

export interface MetricResult {
  status: 'pass' | 'fail' | 'skipped'
  duration_ms: number
  output?: string
  error?: string
}

export interface CoverageSummary {
  lines: { total: number; covered: number; pct: number }
  statements: { total: number; covered: number; pct: number }
  functions: { total: number; covered: number; pct: number }
  branches: { total: number; covered: number; pct: number }
}

export interface GitStats {
  branch: string
  files_changed: number
  insertions: number
  deletions: number
  uncommitted_files: number
  recent_commits: string[]
}

export interface BundleSizeResult extends MetricResult {
  totalBytes?: number
  jsBytes?: number
  cssBytes?: number
  fileCount?: number
  largestFile?: { name: string; bytes: number }
}

export interface TodoResult extends MetricResult {
  total?: number
  breakdown?: { todo: number; fixme: number; hack: number }
  items?: { file: string; line: number; type: string; text: string }[]
}

export interface DuplicatesResult extends MetricResult {
  count?: number
  packages?: { name: string; versions: string[] }[]
}

export interface EnvCheckResult extends MetricResult {
  missing?: string[]
  extra?: string[]
  envFile?: string
  templateFile?: string
}

export interface LicenseResult extends MetricResult {
  total?: number
  risk?: { name: string; license: string; level: 'high' | 'medium' | 'low' }[]
  summary?: Record<string, number>
}

export interface ComplexityResult extends MetricResult {
  totalLines?: number
  totalFiles?: number
  avgLines?: number
  largestFiles?: { file: string; lines: number }[]
  functionCount?: number
}

export interface SecretsResult extends MetricResult {
  findings?: number
  items?: { file: string; line: number; type: string }[]
}

export interface TypeCoverageResult extends MetricResult {
  anyCount?: number
  totalIdentifiers?: number
  percentage?: number
}

export interface TestQualityResult extends MetricResult {
  totalFiles?: number
  totalTests?: number
  avgScore?: number
  weakTests?: number
  strongTests?: number
  gradeDistribution?: { A: number; B: number; C: number; D: number; F: number }
  files?: {
    filePath: string
    directory: string
    totalTests: number
    qualityScore: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    weakTests: number
    strongTests: number
    linesOfCode: number
    tests: {
      name: string
      line: number
      qualityScore: number
      grade: 'A' | 'B' | 'C' | 'D' | 'F'
      assertions: number
      mocks: number
      linesOfCode: number
      smells: { type: string; severity: 'error' | 'warning' | 'info'; message: string }[]
    }[]
  }[]
  smellSummary?: Record<string, number>
}

export interface Metrics {
  timestamp: string
  project: string
  git: GitStats
  lint: MetricResult
  typecheck: MetricResult
  tests: MetricResult & { total?: number; passed?: number; failed?: number }
  coverage: MetricResult & { summary?: CoverageSummary }
  build: MetricResult
  dependencies: { outdated: number; vulnerabilities: number }
  bundlesize: BundleSizeResult
  todos: TodoResult
  duplicates: DuplicatesResult
  envcheck: EnvCheckResult
  licenses: LicenseResult
  complexity: ComplexityResult
  secrets: SecretsResult
  typecoverage: TypeCoverageResult
  testquality: TestQualityResult
}
