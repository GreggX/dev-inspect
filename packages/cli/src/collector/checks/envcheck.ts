/**
 * Check: Environment Validation
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MetricResult } from '../types.js'

export interface EnvCheckResult extends MetricResult {
  missing?: string[]
  extra?: string[]
  envFile?: string
  templateFile?: string
}

function parseEnvVarNames(content: string): Set<string> {
  const names = new Set<string>()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) names.add(match[1])
  }
  return names
}

export function collectEnvCheck(root: string, _command: string): EnvCheckResult {
  console.log('  Validating environment variables...')
  const start = performance.now()

  // Find template file
  const templateNames = ['.env.example', '.env.template', '.env.sample']
  let templateFile: string | null = null
  let templatePath: string | null = null

  for (const name of templateNames) {
    const full = resolve(root, name)
    if (existsSync(full)) {
      templateFile = name
      templatePath = full
      break
    }
  }

  if (!templatePath) {
    return {
      status: 'skipped',
      duration_ms: Math.round(performance.now() - start),
      output: 'No .env.example, .env.template, or .env.sample found',
    }
  }

  // Find actual .env file
  const envPath = resolve(root, '.env')
  const envLocalPath = resolve(root, '.env.local')
  let actualEnvPath: string | null = null
  let envFileName: string | null = null

  if (existsSync(envPath)) {
    actualEnvPath = envPath
    envFileName = '.env'
  } else if (existsSync(envLocalPath)) {
    actualEnvPath = envLocalPath
    envFileName = '.env.local'
  }

  if (!actualEnvPath) {
    const templateVars = parseEnvVarNames(readFileSync(templatePath, 'utf-8'))
    return {
      status: 'fail',
      duration_ms: Math.round(performance.now() - start),
      output: `No .env file found. ${templateVars.size} variables defined in ${templateFile} are missing.`,
      missing: [...templateVars].slice(0, 50),
      extra: [],
      envFile: '(not found)',
      templateFile: templateFile!,
    }
  }

  const templateVars = parseEnvVarNames(readFileSync(templatePath, 'utf-8'))
  const envVars = parseEnvVarNames(readFileSync(actualEnvPath, 'utf-8'))

  const missing = [...templateVars].filter(v => !envVars.has(v))
  const extra = [...envVars].filter(v => !templateVars.has(v))

  const duration_ms = Math.round(performance.now() - start)
  const status = missing.length > 0 ? 'fail' : 'pass'

  return {
    status,
    duration_ms,
    output: `${missing.length} missing, ${extra.length} extra variables (comparing ${envFileName} to ${templateFile})`,
    missing: missing.slice(0, 50),
    extra: extra.slice(0, 50),
    envFile: envFileName!,
    templateFile: templateFile!,
  }
}
