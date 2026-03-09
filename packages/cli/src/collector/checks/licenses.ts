/**
 * Check: License Compliance
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface LicenseResult extends MetricResult {
  total?: number
  risk?: { name: string; license: string; level: 'high' | 'medium' | 'low' }[]
  summary?: Record<string, number>
}

const HIGH_RISK = ['GPL', 'GPL-2.0', 'GPL-3.0', 'AGPL', 'AGPL-3.0', 'SSPL', 'GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only', 'GPL-2.0-or-later', 'GPL-3.0-or-later', 'AGPL-3.0-or-later']
const MEDIUM_RISK = ['LGPL', 'LGPL-2.1', 'LGPL-3.0', 'MPL', 'MPL-2.0', 'LGPL-2.1-only', 'LGPL-3.0-only', 'LGPL-2.1-or-later', 'LGPL-3.0-or-later']

function classifyLicense(license: string): 'high' | 'medium' | 'low' {
  const upper = license.toUpperCase()
  if (HIGH_RISK.some(r => upper.includes(r.toUpperCase()))) return 'high'
  if (MEDIUM_RISK.some(r => upper.includes(r.toUpperCase()))) return 'medium'
  return 'low'
}

function fallbackScan(root: string): Map<string, string> {
  const licenses = new Map<string, string>()
  const nmDir = resolve(root, 'node_modules')
  if (!existsSync(nmDir)) return licenses

  try {
    const entries = readdirSync(nmDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      if (entry.name.startsWith('@')) {
        // Scoped package
        const scopeDir = join(nmDir, entry.name)
        try {
          const scopeEntries = readdirSync(scopeDir, { withFileTypes: true })
          for (const scopeEntry of scopeEntries) {
            if (!scopeEntry.isDirectory()) continue
            const pkgJson = join(scopeDir, scopeEntry.name, 'package.json')
            if (existsSync(pkgJson)) {
              try {
                const pkg = JSON.parse(readFileSync(pkgJson, 'utf-8'))
                const lic = pkg.license || (Array.isArray(pkg.licenses) ? pkg.licenses.map((l: any) => l.type || l).join(', ') : 'UNKNOWN')
                licenses.set(`${entry.name}/${scopeEntry.name}`, typeof lic === 'string' ? lic : String(lic))
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      } else {
        const pkgJson = join(nmDir, entry.name, 'package.json')
        if (existsSync(pkgJson)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgJson, 'utf-8'))
            const lic = pkg.license || (Array.isArray(pkg.licenses) ? pkg.licenses.map((l: any) => l.type || l).join(', ') : 'UNKNOWN')
            licenses.set(entry.name, typeof lic === 'string' ? lic : String(lic))
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  return licenses
}

export function collectLicenses(root: string, command: string): LicenseResult {
  console.log('  Checking dependency licenses...')
  const start = performance.now()

  let licenseMap = new Map<string, string>()

  // Try pnpm licenses command first
  if (command !== 'internal') {
    const result = run(command, root)
    if (result.ok && result.stdout.trim()) {
      try {
        const parsed = JSON.parse(result.stdout)
        // pnpm licenses list --json returns an array of { name, version, license, ... }
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            licenseMap.set(entry.name || entry.package, entry.license || 'UNKNOWN')
          }
        } else if (typeof parsed === 'object') {
          for (const [license, packages] of Object.entries(parsed)) {
            if (Array.isArray(packages)) {
              for (const pkg of packages as any[]) {
                licenseMap.set(pkg.name || pkg.package, license)
              }
            }
          }
        }
      } catch {
        // Fall through to fallback
      }
    }
  }

  // Fallback: scan node_modules
  if (licenseMap.size === 0) {
    licenseMap = fallbackScan(root)
  }

  const summary: Record<string, number> = {}
  const riskItems: LicenseResult['risk'] = []

  for (const [name, license] of licenseMap) {
    summary[license] = (summary[license] || 0) + 1
    const level = classifyLicense(license)
    if (level !== 'low') {
      riskItems.push({ name, license, level })
    }
  }

  // Limit risk items to 50
  const limitedRisk = riskItems.slice(0, 50)
  const duration_ms = Math.round(performance.now() - start)
  const highCount = riskItems.filter(r => r.level === 'high').length

  return {
    status: highCount > 0 ? 'fail' : 'pass',
    duration_ms,
    output: `${licenseMap.size} packages scanned, ${riskItems.length} with elevated risk (${highCount} high)`,
    total: licenseMap.size,
    risk: limitedRisk,
    summary,
  }
}
