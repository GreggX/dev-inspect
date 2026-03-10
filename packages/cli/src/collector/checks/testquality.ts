/**
 * Check: Test Quality Analyzer
 * AST-lite analysis of test files — detects weak tests, counts assertions,
 * identifies test smells, and computes per-test quality scores.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, extname, sep } from 'node:path'
import type { MetricResult } from '../types.js'

// ── Types ──────────────────────────────────────────────────────────

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

export interface TestQualityResult extends MetricResult {
  totalFiles?: number
  totalTests?: number
  avgScore?: number
  weakTests?: number
  strongTests?: number
  gradeDistribution?: { A: number; B: number; C: number; D: number; F: number }
  files?: TestFileAnalysis[]
  smellSummary?: Record<string, number>
}

// ── Helpers ────────────────────────────────────────────────────────

const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\/.*\.[jt]sx?$/,
]

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'coverage', '.git',
  '.dev-metrics', '.turbo', '.cache', 'vendor',
])

function isTestFile(filename: string): boolean {
  return TEST_FILE_PATTERNS.some(p => p.test(filename))
}

function findTestFiles(dir: string, root: string, results: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const fullPath = resolve(dir, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      findTestFiles(fullPath, root, results)
    } else if (stat.isFile() && isTestFile(entry)) {
      results.push(relative(root, fullPath))
    }
  }

  return results
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

// ── Test Block Extraction ──────────────────────────────────────────

interface RawTestBlock {
  name: string
  line: number
  body: string
  bodyStartLine: number
}

function extractTestBlocks(source: string): RawTestBlock[] {
  const blocks: RawTestBlock[] = []
  const lines = source.split('\n')

  // Match it(...), test(...), it.each(...)(...), test.each(...)(...)
  const testStartRe = /^\s*(?:it|test)(?:\.each\s*(?:\([^)]*\)|\`[^`]*\`))?(?:\.(?:only|skip))?\s*\(\s*(['"`])(.*?)\1/

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(testStartRe)
    if (!match) continue

    const name = match[2]
    const startLine = i + 1

    // Find the matching closing of the test block by counting braces
    // Start from the arrow/function body
    let braceDepth = 0
    let started = false
    let bodyLines: string[] = []
    let bodyStartLine = i

    for (let j = i; j < lines.length; j++) {
      const line = lines[j]
      for (const ch of line) {
        if (ch === '{') {
          if (!started) bodyStartLine = j
          started = true
          braceDepth++
        }
        if (ch === '}') braceDepth--
      }
      if (started) bodyLines.push(line)
      if (started && braceDepth === 0) break
    }

    blocks.push({
      name,
      line: startLine,
      body: bodyLines.join('\n'),
      bodyStartLine: bodyStartLine + 1,
    })
  }

  return blocks
}

// ── Smell Detection ────────────────────────────────────────────────

function detectSmells(block: RawTestBlock, fileSource: string): TestSmell[] {
  const smells: TestSmell[] = []
  const body = block.body

  // Count assertions
  const assertionCount = countAssertions(body)

  // No assertions
  if (assertionCount === 0) {
    smells.push({
      type: 'no-assertions',
      severity: 'error',
      message: 'Test has no assertions — it will pass even if the code is broken',
    })
  }

  // Too many assertions (eager test)
  if (assertionCount > 10) {
    smells.push({
      type: 'eager-test',
      severity: 'warning',
      message: `Test has ${assertionCount} assertions — consider splitting into focused tests`,
    })
  }

  // Empty or near-empty test body
  const bodyTrimmed = body.replace(/[{}()\s]/g, '')
  if (bodyTrimmed.length < 10) {
    smells.push({
      type: 'empty-test',
      severity: 'error',
      message: 'Test body is empty or trivially short',
    })
  }

  // Excessive mocking
  const mockCount = countMocks(body)
  if (mockCount > 5) {
    smells.push({
      type: 'excessive-mocking',
      severity: 'warning',
      message: `Test creates ${mockCount} mocks — may be testing mocks instead of real code`,
    })
  }

  // Conditional assertions
  if (/\bif\s*\(/.test(body) && assertionCount > 0) {
    smells.push({
      type: 'conditional-assertion',
      severity: 'warning',
      message: 'Assertions inside conditionals may not always execute',
    })
  }

  // Tautological assertion patterns
  if (/expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/.test(body) ||
      /expect\s*\(\s*1\s*\)\s*\.toBe\s*\(\s*1\s*\)/.test(body) ||
      /expect\s*\(\s*['"].*?['"]\s*\)\s*\.toBe\s*\(\s*['"].*?['"]\s*\)/.test(body)) {
    smells.push({
      type: 'tautological',
      severity: 'error',
      message: 'Test contains assertions that can never fail',
    })
  }

  // Missing await on async
  if (/async\s/.test(body)) {
    const hasAwait = /\bawait\b/.test(body)
    const hasReturn = /\breturn\b/.test(body)
    if (!hasAwait && !hasReturn) {
      smells.push({
        type: 'no-await-async',
        severity: 'warning',
        message: 'Async test without await — promises may not be checked',
      })
    }
  }

  // setTimeout/sleep usage (flaky indicator)
  if (/setTimeout|sleep|delay/.test(body) && !/fake.*timer|useFakeTimers|vi\.useFakeTimers/.test(body)) {
    smells.push({
      type: 'flaky-indicator',
      severity: 'info',
      message: 'Test uses real timers — consider using fake timers for reliability',
    })
  }

  // Console.log left in test (noise)
  if (/console\.\w+\s*\(/.test(body)) {
    smells.push({
      type: 'console-noise',
      severity: 'info',
      message: 'Test contains console output — consider removing or spying',
    })
  }

  return smells
}

function countAssertions(body: string): number {
  const patterns = [
    /\bexpect\s*\(/g,
    /\bassert\s*[\.(]/g,
    /\.should\b/g,
    /\.toThrow/g,
    /\.rejects\./g,
    /\.resolves\./g,
  ]
  let count = 0
  for (const pattern of patterns) {
    const matches = body.match(pattern)
    if (matches) count += matches.length
  }
  // Avoid double-counting: expect().rejects. or expect().resolves. chains
  // We already count expect(), so subtract the rejects/resolves counted separately
  const rejectsResolves = (body.match(/expect\s*\([^)]*\)\s*\.\s*(?:rejects|resolves)/g) || []).length
  count -= rejectsResolves
  return Math.max(0, count)
}

function countMocks(body: string): number {
  const patterns = [
    /\bvi\.fn\s*\(/g,
    /\bjest\.fn\s*\(/g,
    /\bvi\.mock\s*\(/g,
    /\bjest\.mock\s*\(/g,
    /\bvi\.spyOn\s*\(/g,
    /\bjest\.spyOn\s*\(/g,
    /\bsinon\.\w+\s*\(/g,
    /\bnock\s*\(/g,
  ]
  let count = 0
  for (const pattern of patterns) {
    const matches = body.match(pattern)
    if (matches) count += matches.length
  }
  return count
}

// ── Score Computation ──────────────────────────────────────────────

function computeTestScore(block: RawTestBlock, smells: TestSmell[]): number {
  let score = 100

  const assertions = countAssertions(block.body)
  const mocks = countMocks(block.body)

  // Assertion quality (0-35 points)
  if (assertions === 0) score -= 35
  else if (assertions === 1) score -= 10
  else if (assertions > 10) score -= 10
  // 2-5 is ideal

  // Smell penalties
  for (const smell of smells) {
    if (smell.severity === 'error') score -= 20
    else if (smell.severity === 'warning') score -= 10
    else score -= 3
  }

  // Mock penalty (0-15 points)
  if (mocks > 5) score -= 15
  else if (mocks > 3) score -= 7

  // Naming quality bonus
  const name = block.name.toLowerCase()
  if (name.startsWith('should ') || name.includes('when ') || name.includes('given ')) {
    score += 5 // behavioral naming
  }
  if (name.length < 5) score -= 5 // too short to be descriptive

  // Body size — very short tests with assertions are focused (good)
  const bodyLines = block.body.split('\n').filter(l => l.trim()).length
  if (bodyLines > 50) score -= 5 // very long test

  return Math.max(0, Math.min(100, score))
}

// ── Main Collector ─────────────────────────────────────────────────

export function collectTestQuality(root: string, _command: string): TestQualityResult {
  console.log('  Analyzing test quality...')
  const start = performance.now()

  const testFiles = findTestFiles(root, root)

  if (testFiles.length === 0) {
    return {
      status: 'skipped',
      duration_ms: Math.round(performance.now() - start),
      output: 'No test files found',
    }
  }

  const files: TestFileAnalysis[] = []
  const globalSmellCounts: Record<string, number> = {}
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  let totalTests = 0
  let totalWeak = 0
  let totalStrong = 0
  let totalScore = 0

  for (const filePath of testFiles) {
    let source: string
    try {
      source = readFileSync(resolve(root, filePath), 'utf-8')
    } catch {
      continue
    }

    const blocks = extractTestBlocks(source)
    if (blocks.length === 0) continue

    const tests: TestCaseAnalysis[] = []
    let fileScore = 0
    let fileWeak = 0
    let fileStrong = 0

    for (const block of blocks) {
      const smells = detectSmells(block, source)
      const score = computeTestScore(block, smells)
      const grade = scoreToGrade(score)
      const assertions = countAssertions(block.body)
      const mocks = countMocks(block.body)
      const bodyLines = block.body.split('\n').filter(l => l.trim()).length

      // Track smell counts
      for (const smell of smells) {
        globalSmellCounts[smell.type] = (globalSmellCounts[smell.type] || 0) + 1
      }

      if (score < 50) fileWeak++
      else if (score >= 75) fileStrong++

      fileScore += score
      tests.push({ name: block.name, line: block.line, qualityScore: score, grade, assertions, mocks, linesOfCode: bodyLines, smells })
    }

    const avgFileScore = Math.round(fileScore / tests.length)
    const fileGrade = scoreToGrade(avgFileScore)
    gradeDistribution[fileGrade]++

    // Extract directory for treemap grouping
    const parts = filePath.split(sep)
    const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'

    const fileLOC = source.split('\n').length
    files.push({
      filePath,
      directory,
      tests,
      totalTests: tests.length,
      qualityScore: avgFileScore,
      grade: fileGrade,
      weakTests: fileWeak,
      strongTests: fileStrong,
      linesOfCode: fileLOC,
    })

    totalTests += tests.length
    totalWeak += fileWeak
    totalStrong += fileStrong
    totalScore += fileScore
  }

  // Sort files by quality score ascending (worst first)
  files.sort((a, b) => a.qualityScore - b.qualityScore)

  const avgScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0
  const duration_ms = Math.round(performance.now() - start)

  return {
    status: totalWeak > 0 ? 'fail' : 'pass',
    duration_ms,
    output: `${totalTests} tests in ${files.length} files — avg score: ${avgScore}/100 — ${totalWeak} weak, ${totalStrong} strong`,
    totalFiles: files.length,
    totalTests,
    avgScore,
    weakTests: totalWeak,
    strongTests: totalStrong,
    gradeDistribution,
    files: files.slice(0, 100), // limit to 100 files
    smellSummary: globalSmellCounts,
  }
}
