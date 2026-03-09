import { signal, type Signal } from '../core/state.js'

export interface Annotation {
  selector: string
  comment: string
  component?: string
  filePath?: string
  lineNumber?: number
  nearestUserComponent?: {
    name: string
    filePath?: string
  }
  styles?: Record<string, string>
}

export interface ScreenshotFile {
  name: string
  url: string
  time: string
}

export interface PromptLogEntry {
  timestamp: string
  annotationCount: number
  pageUrl: string
  pageTitle: string
  prompt: string
}

export function useAnnotations(): {
  annotations: Signal<Annotation[]>
  screenshots: Signal<ScreenshotFile[]>
  promptLog: Signal<PromptLogEntry[]>
  loadAnnotations: () => Promise<void>
  loadScreenshots: () => Promise<void>
  loadPromptLog: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  sendToClaude: (pageUrl: string, pageTitle: string) => Promise<{ success: boolean; prompt?: string }>
} {
  const annotations = signal<Annotation[]>([])
  const screenshots = signal<ScreenshotFile[]>([])
  const promptLog = signal<PromptLogEntry[]>([])
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function loadAnnotations() {
    try {
      const res = await fetch('/api/annotations')
      const data = await res.json()
      annotations.set(data.annotations || [])
    } catch {}
  }

  async function loadScreenshots() {
    try {
      const res = await fetch('/api/screenshots')
      const files = await res.json()
      screenshots.set(files)
    } catch {}
  }

  async function loadPromptLog() {
    try {
      const res = await fetch('/api/prompt-log')
      const data = await res.json()
      promptLog.set(data)
    } catch {}
  }

  function startPolling() {
    if (pollInterval) return
    loadAnnotations()
    loadScreenshots()
    loadPromptLog()
    pollInterval = setInterval(() => {
      loadAnnotations()
    }, 2000)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  async function sendToClaude(
    pageUrl: string,
    pageTitle: string,
  ): Promise<{ success: boolean; prompt?: string }> {
    try {
      const res = await fetch('/api/send-to-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotations: annotations(),
          pageUrl,
          pageTitle,
        }),
      })
      const result = await res.json()
      if (result.success) {
        // Reload prompt log after successful send
        loadPromptLog()
        return { success: true, prompt: result.prompt }
      }
      return { success: false }
    } catch {
      return { success: false }
    }
  }

  return { annotations, screenshots, promptLog, loadAnnotations, loadScreenshots, loadPromptLog, startPolling, stopPolling, sendToClaude }
}
