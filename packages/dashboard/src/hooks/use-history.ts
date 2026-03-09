import { signal, type Signal } from '../core/state.js'

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

export function useHistory(): {
  history: Signal<HistoryEntry[]>
  loadHistory: () => Promise<void>
} {
  const history = signal<HistoryEntry[]>([])

  async function loadHistory() {
    try {
      const res = await fetch('/api/history?limit=50')
      const data = await res.json()
      history.set(data)
    } catch {}
  }

  return { history, loadHistory }
}
