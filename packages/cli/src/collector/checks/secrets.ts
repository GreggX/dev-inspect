/**
 * Check: Secrets Detection
 * NEVER includes actual secret values in output — only file path, line number, and pattern type
 */

import type { MetricResult } from '../types.js'
import { run } from '../runner.js'

export interface SecretsResult extends MetricResult {
  findings?: number
  items?: { file: string; line: number; type: string }[]
}

interface SecretPattern {
  name: string
  pattern: string
}

const PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key', pattern: 'AKIA[0-9A-Z]{16}' },
  { name: 'OpenAI/Stripe Key', pattern: 'sk-[a-zA-Z0-9]{20,}' },
  { name: 'GitHub Token', pattern: 'ghp_[a-zA-Z0-9]{36}' },
  { name: 'GitHub OAuth', pattern: 'gho_[a-zA-Z0-9]{36}' },
  { name: 'Hardcoded Password', pattern: 'password\\s*[:=]\\s*["\'][^\'"]{4,}["\']' },
  { name: 'Generic API Key', pattern: '(api[_-]?key|apikey|secret[_-]?key)\\s*[:=]\\s*["\'][^\'"]{8,}["\']' },
]

export function collectSecrets(root: string, _command: string): SecretsResult {
  console.log('  Scanning for secrets...')
  const start = performance.now()

  const items: SecretsResult['items'] = []

  for (const pattern of PATTERNS) {
    const grepCmd = [
      `grep -rn -E '${pattern.pattern}'`,
      '--include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py"',
      '--include="*.json" --include="*.yml" --include="*.yaml" --include="*.toml"',
      '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next',
      '--exclude-dir=coverage --exclude-dir=.git',
      '--exclude=".env" --exclude=".env.local" --exclude=".env.development" --exclude=".env.production"',
      '--exclude="package-lock.json" --exclude="pnpm-lock.yaml" --exclude="yarn.lock"',
      '. 2>/dev/null || true',
    ].join(' ')

    const result = run(grepCmd, root)
    const lines = (result.stdout || '').split('\n').filter(l => l.trim())

    for (const line of lines) {
      const match = line.match(/^\.?\/?(.+?):(\d+):/)
      if (!match) continue
      const [, file, lineNum] = match

      // Skip test fixtures, snapshots, and lock files
      if (file.includes('__snapshots__') || file.includes('.snap') || file.includes('fixture')) continue

      if (items.length < 50) {
        // NEVER include the actual matched text — only location and type
        items.push({ file, line: parseInt(lineNum, 10), type: pattern.name })
      }
    }
  }

  const duration_ms = Math.round(performance.now() - start)

  return {
    status: items.length > 0 ? 'fail' : 'pass',
    duration_ms,
    output: items.length > 0
      ? `Found ${items.length} potential secret(s) in source code`
      : 'No secrets detected',
    findings: items.length,
    items,
  }
}
