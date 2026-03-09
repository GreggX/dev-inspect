/**
 * Check: Duplicate Dependencies
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface DuplicatesResult extends MetricResult {
  count?: number
  packages?: { name: string; versions: string[] }[]
}

export function collectDuplicates(root: string, command: string): DuplicatesResult {
  console.log('  Checking for duplicate dependencies...')
  const start = performance.now()

  const result = run(command, root)
  const duration_ms = Math.round(performance.now() - start)

  if (!result.stdout.trim()) {
    return {
      status: 'skipped',
      duration_ms,
      output: 'Could not retrieve dependency tree',
    }
  }

  // Parse the JSON output to find duplicates
  const versionMap = new Map<string, Set<string>>()

  try {
    const parsed = JSON.parse(result.stdout)

    function walk(deps: Record<string, any>) {
      if (!deps || typeof deps !== 'object') return
      for (const [name, info] of Object.entries(deps)) {
        if (info && typeof info === 'object') {
          const version = (info as any).version
          if (version) {
            if (!versionMap.has(name)) versionMap.set(name, new Set())
            versionMap.get(name)!.add(version)
          }
          if ((info as any).dependencies) walk((info as any).dependencies)
        }
      }
    }

    // Handle both pnpm and npm output formats
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (entry.dependencies) walk(entry.dependencies)
        if (entry.devDependencies) walk(entry.devDependencies)
      }
    } else if (parsed.dependencies) {
      walk(parsed.dependencies)
    }
  } catch {
    return {
      status: 'fail',
      duration_ms,
      output: 'Failed to parse dependency tree output',
      error: result.stderr.slice(0, 500),
    }
  }

  const duplicates: DuplicatesResult['packages'] = []
  for (const [name, versions] of versionMap) {
    if (versions.size > 1) {
      duplicates.push({ name, versions: [...versions].sort() })
    }
  }

  // Limit to 50 entries
  const limited = duplicates.slice(0, 50)

  return {
    status: 'pass',
    duration_ms,
    output: `Found ${duplicates.length} packages with multiple versions`,
    count: duplicates.length,
    packages: limited,
  }
}
