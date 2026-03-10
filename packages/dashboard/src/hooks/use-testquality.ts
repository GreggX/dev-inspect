import { signal, type Signal } from '../core/state.js'

export interface TestSmell {
  type: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface TestCaseAnalysis {
  name: string
  line: number
  qualityScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  assertions: number
  mocks: number
  linesOfCode: number
  smells: TestSmell[]
}

export interface TestFileAnalysis {
  filePath: string
  directory: string
  tests: TestCaseAnalysis[]
  totalTests: number
  qualityScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  weakTests: number
  strongTests: number
  linesOfCode: number
}

export interface TestQualityData {
  status: string
  duration_ms: number
  output?: string
  totalFiles?: number
  totalTests?: number
  avgScore?: number
  weakTests?: number
  strongTests?: number
  gradeDistribution?: { A: number; B: number; C: number; D: number; F: number }
  files?: TestFileAnalysis[]
  smellSummary?: Record<string, number>
}

export function useTestQuality(): { data: Signal<TestQualityData | null>; activate: () => void } {
  const data = signal<TestQualityData | null>(null)
  let loaded = false

  function activate() {
    if (loaded) return
    loaded = true
    fetch('/api/testquality')
      .then(r => r.json())
      .then(json => {
        if (!json.error) data.set(json)
      })
      .catch(() => {})
  }

  return { data, activate }
}
