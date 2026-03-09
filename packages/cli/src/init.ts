/**
 * dev-inspect init — Interactive project scanner and config generator
 * Detects available tools, prompts user to enable/disable, writes .dev-inspect.json
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { saveConfig, configPath, DEFAULT_COMMANDS, type DevInspectConfig, type CheckConfig, type CheckName } from './config.js'

// --- Tool Detection ---

interface Detection {
  detected: boolean
  command: string
  hint?: string
}

function readPkg(root: string): Record<string, any> {
  const pkgPath = resolve(root, 'package.json')
  if (!existsSync(pkgPath)) return {}
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    return {}
  }
}

function hasDep(pkg: Record<string, any>, name: string): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name])
}

function hasFile(root: string, ...patterns: string[]): boolean {
  return patterns.some(p => existsSync(resolve(root, p)))
}

function detectPackageManager(root: string): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  if (hasFile(root, 'pnpm-lock.yaml')) return 'pnpm'
  if (hasFile(root, 'yarn.lock')) return 'yarn'
  if (hasFile(root, 'bun.lockb', 'bun.lock')) return 'bun'
  return 'npm'
}

function detectLint(pkg: Record<string, any>, pm: string, root: string): Detection {
  const hasEslint = hasDep(pkg, 'eslint') ||
    hasFile(root, 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts', '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml')
  const hasBiome = hasDep(pkg, '@biomejs/biome') || hasFile(root, 'biome.json', 'biome.jsonc')

  if (hasBiome) return { detected: true, command: `${pm} biome check .`, hint: 'Biome detected' }
  if (hasEslint) return { detected: true, command: `${pm} eslint .`, hint: 'ESLint detected' }
  return { detected: false, command: `${pm} eslint .` }
}

function detectTypecheck(pkg: Record<string, any>, pm: string, root: string): Detection {
  const hasTs = hasDep(pkg, 'typescript') || hasFile(root, 'tsconfig.json')
  return { detected: hasTs, command: `${pm} tsc --noEmit`, hint: hasTs ? 'TypeScript detected' : undefined }
}

function detectTests(pkg: Record<string, any>, pm: string, root: string): Detection {
  const hasVitest = hasDep(pkg, 'vitest') || hasFile(root, 'vitest.config.ts', 'vitest.config.js', 'vitest.config.mts')
  const hasJest = hasDep(pkg, 'jest') || hasFile(root, 'jest.config.js', 'jest.config.ts', 'jest.config.mjs')
  const hasPlaywrightTest = hasDep(pkg, '@playwright/test') || hasFile(root, 'playwright.config.ts', 'playwright.config.js')

  if (hasVitest) return { detected: true, command: `${pm} vitest run`, hint: 'Vitest detected' }
  if (hasJest) return { detected: true, command: `${pm} jest`, hint: 'Jest detected' }
  if (hasPlaywrightTest) return { detected: true, command: `${pm} playwright test`, hint: 'Playwright Test detected' }

  // Check for test script in package.json
  if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
    return { detected: true, command: `${pm} test`, hint: 'test script detected' }
  }

  return { detected: false, command: `${pm} vitest run` }
}

function detectCoverage(pkg: Record<string, any>, pm: string): Detection {
  const hasVitest = hasDep(pkg, 'vitest')
  const hasJest = hasDep(pkg, 'jest')

  if (hasVitest) return { detected: true, command: `${pm} vitest run --coverage`, hint: 'Vitest coverage' }
  if (hasJest) return { detected: true, command: `${pm} jest --coverage`, hint: 'Jest coverage' }
  return { detected: false, command: `${pm} vitest run --coverage` }
}

function detectBuild(pkg: Record<string, any>, pm: string): Detection {
  if (pkg.scripts?.build) {
    return { detected: true, command: `${pm} run build`, hint: 'build script detected' }
  }
  return { detected: false, command: `${pm} run build` }
}

function detectBundleSize(_pkg: Record<string, any>, _pm: string, _root: string): Detection {
  return { detected: true, command: 'internal', hint: 'built-in file analysis' }
}

function detectTodos(_pkg: Record<string, any>, _pm: string, _root: string): Detection {
  return { detected: true, command: 'internal', hint: 'built-in grep scanner' }
}

function detectDuplicates(_pkg: Record<string, any>, pm: string, root: string): Detection {
  const hasPnpm = hasFile(root, 'pnpm-lock.yaml')
  const hasNpm = hasFile(root, 'package-lock.json')
  if (hasPnpm) return { detected: true, command: 'pnpm ls --depth Infinity --json 2>/dev/null', hint: 'pnpm detected' }
  if (hasNpm) return { detected: true, command: 'npm ls --all --json 2>/dev/null', hint: 'npm detected' }
  return { detected: false, command: `${pm} ls --depth Infinity --json 2>/dev/null` }
}

function detectEnvCheck(_pkg: Record<string, any>, _pm: string, root: string): Detection {
  const hasTemplate = hasFile(root, '.env.example', '.env.template', '.env.sample')
  return { detected: hasTemplate, command: 'internal', hint: hasTemplate ? '.env template found' : 'no .env template found' }
}

function detectLicenses(_pkg: Record<string, any>, _pm: string, root: string): Detection {
  const hasPnpm = hasFile(root, 'pnpm-lock.yaml')
  if (hasPnpm) return { detected: true, command: 'pnpm licenses list --json 2>/dev/null', hint: 'pnpm licenses' }
  return { detected: false, command: 'pnpm licenses list --json 2>/dev/null', hint: 'fallback to node_modules scan' }
}

function detectComplexity(_pkg: Record<string, any>, _pm: string, _root: string): Detection {
  return { detected: true, command: 'internal', hint: 'built-in file analysis' }
}

function detectSecrets(_pkg: Record<string, any>, _pm: string, _root: string): Detection {
  return { detected: true, command: 'internal', hint: 'built-in pattern scanner' }
}

function detectTypeCoverage(pkg: Record<string, any>, _pm: string, root: string): Detection {
  const hasTs = hasDep(pkg, 'typescript') || hasFile(root, 'tsconfig.json')
  return { detected: hasTs, command: 'internal', hint: hasTs ? 'TypeScript detected' : 'no TypeScript found' }
}

// --- Interactive Prompts ---

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

async function confirm(rl: ReturnType<typeof createInterface>, question: string, defaultYes: boolean): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]'
  const answer = (await ask(rl, `${question} ${hint} `)).trim().toLowerCase()
  if (answer === '') return defaultYes
  return answer === 'y' || answer === 'yes'
}

// --- Main ---

export async function runInit() {
  const ROOT = process.env.DEV_INSPECT_ROOT ?? process.cwd()
  const useDefaults = process.argv.includes('--yes') || process.argv.includes('-y')

  console.log('\n  dev-inspect init\n')
  console.log(`  Scanning project: ${ROOT}\n`)

  const pkg = readPkg(ROOT)
  if (!pkg.name) {
    console.log('  ⚠ No package.json found. Creating config with defaults.\n')
  } else {
    console.log(`  Project: ${pkg.name}\n`)
  }

  const pm = detectPackageManager(ROOT)
  console.log(`  Package manager: ${pm}\n`)

  const detections: Record<CheckName, Detection> = {
    lint: detectLint(pkg, pm, ROOT),
    typecheck: detectTypecheck(pkg, pm, ROOT),
    tests: detectTests(pkg, pm, ROOT),
    coverage: detectCoverage(pkg, pm),
    build: detectBuild(pkg, pm),
    bundlesize: detectBundleSize(pkg, pm, ROOT),
    todos: detectTodos(pkg, pm, ROOT),
    duplicates: detectDuplicates(pkg, pm, ROOT),
    envcheck: detectEnvCheck(pkg, pm, ROOT),
    licenses: detectLicenses(pkg, pm, ROOT),
    complexity: detectComplexity(pkg, pm, ROOT),
    secrets: detectSecrets(pkg, pm, ROOT),
    typecoverage: detectTypeCoverage(pkg, pm, ROOT),
  }

  // Show detected tools
  console.log('  Detected tools:')
  for (const [name, det] of Object.entries(detections)) {
    const icon = det.detected ? '✓' : '✗'
    const hint = det.hint ?? 'not found'
    console.log(`    ${icon} ${name}: ${hint}`)
  }
  console.log()

  const checks: DevInspectConfig['checks'] = {}

  if (useDefaults) {
    // Accept all detected defaults
    for (const [name, det] of Object.entries(detections) as [CheckName, Detection][]) {
      checks[name] = { enabled: det.detected, command: det.command }
    }
    console.log('  Using detected defaults (--yes flag)\n')
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout })

    for (const [name, det] of Object.entries(detections) as [CheckName, Detection][]) {
      const enabled = await confirm(rl, `  Enable ${name}?`, det.detected)
      let command = det.command

      if (enabled) {
        const customCmd = await ask(rl, `    Command [${command}]: `)
        if (customCmd.trim()) command = customCmd.trim()
      }

      checks[name] = { enabled, command }
    }

    rl.close()
  }

  const config: DevInspectConfig = { checks }

  // Check for existing config
  const existing = existsSync(configPath(ROOT))
  if (existing && !useDefaults) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const overwrite = await confirm(rl, '\n  .dev-inspect.json already exists. Overwrite?', true)
    rl.close()
    if (!overwrite) {
      console.log('  Aborted.\n')
      return
    }
  }

  saveConfig(ROOT, config)

  console.log(`\n  Config saved to ${configPath(ROOT)}\n`)
  console.log('  Next steps:')
  console.log('    dev-inspect collect    — run enabled checks')
  console.log('    dev-inspect            — start dashboard')
  console.log('    dev-inspect mcp        — start MCP server\n')
}
