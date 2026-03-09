/**
 * Config loader for .dev-inspect.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export interface CheckConfig {
  enabled: boolean
  command?: string
}

export interface ThresholdsConfig {
  coverageMin?: number        // minimum line coverage % (e.g. 80)
  bundleSizeMaxKb?: number    // max bundle size in KB
  maxSecrets?: number         // max allowed secrets (typically 0)
  maxTodos?: number           // max TODO/FIXME items
  maxDuplicateDeps?: number   // max duplicate dependency packages
  maxHighRiskLicenses?: number // max high-risk licenses (typically 0)
}

export interface DevInspectConfig {
  checks: {
    lint?: CheckConfig
    typecheck?: CheckConfig
    tests?: CheckConfig
    coverage?: CheckConfig
    build?: CheckConfig
    bundlesize?: CheckConfig
    todos?: CheckConfig
    duplicates?: CheckConfig
    envcheck?: CheckConfig
    licenses?: CheckConfig
    complexity?: CheckConfig
    secrets?: CheckConfig
    typecoverage?: CheckConfig
  }
  thresholds?: ThresholdsConfig
}

export const CHECK_NAMES = ['lint', 'typecheck', 'tests', 'coverage', 'build', 'bundlesize', 'todos', 'duplicates', 'envcheck', 'licenses', 'complexity', 'secrets', 'typecoverage'] as const
export type CheckName = (typeof CHECK_NAMES)[number]

export const DEFAULT_COMMANDS: Record<CheckName, string> = {
  lint: 'pnpm eslint . --format json 2>/dev/null || pnpm eslint .',
  typecheck: 'pnpm tsc --noEmit',
  tests: 'pnpm vitest run --reporter=json 2>/dev/null',
  coverage: 'pnpm vitest run --coverage --coverage.reportOnFailure 2>&1 || true',
  build: 'pnpm build',
  bundlesize: 'internal',
  todos: 'internal',
  duplicates: 'pnpm ls --depth Infinity --json 2>/dev/null || npm ls --all --json 2>/dev/null',
  envcheck: 'internal',
  licenses: 'pnpm licenses list --json 2>/dev/null',
  complexity: 'internal',
  secrets: 'internal',
  typecoverage: 'internal',
}

const CONFIG_FILENAME = '.dev-inspect.json'

export function configPath(root: string): string {
  return resolve(root, CONFIG_FILENAME)
}

export function loadConfig(root: string): DevInspectConfig | null {
  const path = configPath(root)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

export function saveConfig(root: string, config: DevInspectConfig): void {
  writeFileSync(configPath(root), JSON.stringify(config, null, 2) + '\n')
}

export function isCheckEnabled(config: DevInspectConfig | null, name: CheckName): boolean {
  if (!config) return true // no config = all enabled (backward compat)
  const check = config.checks[name]
  return check ? check.enabled : true
}

export function getCheckCommand(config: DevInspectConfig | null, name: CheckName): string {
  const check = config?.checks?.[name]
  return check?.command ?? DEFAULT_COMMANDS[name]
}
