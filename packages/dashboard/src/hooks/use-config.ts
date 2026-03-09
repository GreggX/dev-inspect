import { signal, type Signal } from '../core/state.js'

export interface CheckConfig {
  enabled: boolean
  command?: string
}

export interface Config {
  checks: Record<string, CheckConfig>
}

export const CHECK_LABELS: Record<string, string> = {
  lint: 'Lint',
  typecheck: 'TypeScript',
  tests: 'Tests',
  coverage: 'Coverage',
  build: 'Build',
}

export const CHECK_DEFAULTS: Record<string, string> = {
  lint: 'pnpm eslint .',
  typecheck: 'pnpm tsc --noEmit',
  tests: 'pnpm vitest run',
  coverage: 'pnpm vitest run --coverage',
  build: 'pnpm build',
}

export function useConfig(): {
  config: Signal<Config | null>
  loaded: Signal<boolean>
  load: () => Promise<void>
  save: (checks: Record<string, CheckConfig>) => Promise<{ success: boolean; error?: string }>
} {
  const config = signal<Config | null>(null)
  const loaded = signal(false)

  async function load() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        config.set(await res.json())
      }
    } catch {}
    loaded.set(true)
  }

  async function save(
    checks: Record<string, CheckConfig>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checks }),
      })
      if (res.ok) {
        return { success: true }
      } else {
        const err = await res.json()
        return { success: false, error: err.error || 'Save failed' }
      }
    } catch {
      return { success: false, error: 'Save failed' }
    }
  }

  return { config, loaded, load, save }
}
