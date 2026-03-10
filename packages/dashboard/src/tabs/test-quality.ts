/**
 * Test Quality Tab — Treemap overview + Bubble detail + Side panel
 *
 * Storytelling flow:
 *   1. Treemap: "Where are the problems?" (files colored by quality grade)
 *   2. Bubble chart: "What kind of problems?" (click a treemap cell to drill in)
 *   3. Detail panel: "What's wrong and how to fix it?" (click a bubble)
 */

import { h } from '../core/dom.js'
import { signal, effect, type Signal } from '../core/state.js'
import { css } from '../core/styles.js'
import type { TestQualityData, TestFileAnalysis, TestCaseAnalysis } from '../hooks/use-testquality.js'

// ── Styles ─────────────────────────────────────────────────────────

const styles = css`
.tq-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.tq-stat {
  background: var(--card-bg, #1a1a2e);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.tq-stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.tq-stat-label {
  font-size: 12px;
  color: var(--text-dim, #888);
  margin-top: 4px;
}

.tq-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-dim, #888);
}

.tq-breadcrumb button {
  background: none;
  border: 1px solid var(--border, #333);
  color: var(--text, #eee);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
}

.tq-breadcrumb button:hover {
  background: var(--card-bg, #1a1a2e);
}

.tq-treemap-container {
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border, #333);
  position: relative;
}

.tq-treemap-cell {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(0,0,0,0.3);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4px;
  transition: filter 0.15s, transform 0.15s;
  text-align: center;
}

.tq-treemap-cell:hover {
  filter: brightness(1.2);
  z-index: 2;
  transform: scale(1.02);
}

.tq-treemap-label {
  font-size: 11px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  pointer-events: none;
}

.tq-treemap-grade {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.7);
  pointer-events: none;
}

.tq-bubble-area {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border, #333);
}

.tq-bubble {
  position: absolute;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  transition: transform 0.15s, box-shadow 0.15s;
  border: 2px solid rgba(255,255,255,0.15);
}

.tq-bubble:hover {
  transform: scale(1.15);
  box-shadow: 0 0 16px rgba(255,255,255,0.2);
  z-index: 3;
}

.tq-axis-label {
  position: absolute;
  font-size: 11px;
  color: var(--text-dim, #888);
  pointer-events: none;
}

.tq-detail-panel {
  background: var(--card-bg, #1a1a2e);
  border-radius: 10px;
  border: 1px solid var(--border, #333);
  padding: 20px;
  margin-top: 16px;
}

.tq-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.tq-detail-grade {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.tq-detail-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #eee);
}

.tq-detail-path {
  font-size: 12px;
  color: var(--text-dim, #888);
  font-family: monospace;
}

.tq-detail-dims {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.tq-dim {
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}

.tq-dim-value {
  font-size: 20px;
  font-weight: 700;
}

.tq-dim-label {
  font-size: 11px;
  color: var(--text-dim, #888);
  margin-top: 2px;
}

.tq-smell-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tq-smell-list li {
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tq-smell-error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.tq-smell-warning {
  background: rgba(234, 179, 8, 0.12);
  color: #facc15;
}

.tq-smell-info {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

.tq-smell-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.tq-smells-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tq-smell-chip {
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-dim, #888);
  display: flex;
  align-items: center;
  gap: 6px;
}

.tq-smell-chip-count {
  font-weight: 700;
  color: var(--text, #eee);
}

.tq-legend {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-dim, #888);
}

.tq-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tq-legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.tq-no-data {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-dim, #888);
}

.tq-no-data h2 {
  color: var(--text, #eee);
  margin-bottom: 12px;
}

.tq-no-data code {
  background: rgba(255,255,255,0.06);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}
`

// ── Color helpers ──────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

function gradeColor(grade: string): string {
  return GRADE_COLORS[grade] || '#666'
}

function scoreColor(score: number): string {
  if (score >= 85) return GRADE_COLORS.A
  if (score >= 70) return GRADE_COLORS.B
  if (score >= 55) return GRADE_COLORS.C
  if (score >= 40) return GRADE_COLORS.D
  return GRADE_COLORS.F
}

// ── Treemap Layout (squarified) ────────────────────────────────────

interface TreemapRect {
  x: number; y: number; w: number; h: number
  data: TestFileAnalysis
}

function layoutTreemap(files: TestFileAnalysis[], width: number, height: number): TreemapRect[] {
  if (files.length === 0) return []

  // Sort descending by total tests (area = number of tests)
  const sorted = [...files].sort((a, b) => b.totalTests - a.totalTests)
  const totalArea = sorted.reduce((s, f) => s + Math.max(f.totalTests, 1), 0)

  const rects: TreemapRect[] = []
  squarify(sorted, 0, 0, width, height, totalArea, rects)
  return rects
}

function squarify(
  items: TestFileAnalysis[], x: number, y: number, w: number, h: number,
  totalArea: number, rects: TreemapRect[],
): void {
  if (items.length === 0 || w <= 0 || h <= 0) return

  if (items.length === 1) {
    rects.push({ x, y, w, h, data: items[0] })
    return
  }

  const isWide = w >= h

  // Binary split: find a partition that gives good aspect ratios
  let bestSplit = 1
  let bestRatio = Infinity

  let leftArea = 0
  for (let i = 0; i < items.length - 1; i++) {
    leftArea += Math.max(items[i].totalTests, 1)
    const fraction = leftArea / totalArea
    const ratio = isWide
      ? Math.max((fraction * w) / h, h / (fraction * w))
      : Math.max((fraction * h) / w, w / (fraction * h))
    if (ratio < bestRatio) {
      bestRatio = ratio
      bestSplit = i + 1
    }
  }

  const left = items.slice(0, bestSplit)
  const right = items.slice(bestSplit)
  const leftTotal = left.reduce((s, f) => s + Math.max(f.totalTests, 1), 0)
  const rightTotal = right.reduce((s, f) => s + Math.max(f.totalTests, 1), 0)
  const fraction = leftTotal / (leftTotal + rightTotal)

  if (isWide) {
    const splitX = w * fraction
    squarify(left, x, y, splitX, h, leftTotal, rects)
    squarify(right, x + splitX, y, w - splitX, h, rightTotal, rects)
  } else {
    const splitY = h * fraction
    squarify(left, x, y, w, splitY, leftTotal, rects)
    squarify(right, x, y + splitY, w, h - splitY, rightTotal, rects)
  }
}

// ── Bubble Layout ──────────────────────────────────────────────────

interface BubbleItem {
  x: number; y: number; r: number
  data: TestCaseAnalysis
}

function layoutBubbles(tests: TestCaseAnalysis[], width: number, height: number): BubbleItem[] {
  if (tests.length === 0) return []

  const padding = 60
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  // X = assertions (more assertions → right)
  // Y = quality score (higher → top)
  // R = lines of code
  const maxAssertions = Math.max(...tests.map(t => t.assertions), 1)
  const maxLOC = Math.max(...tests.map(t => t.linesOfCode), 1)

  return tests.map(t => {
    const xNorm = Math.min(t.assertions / Math.max(maxAssertions, 5), 1)
    const yNorm = t.qualityScore / 100
    const rNorm = Math.max(t.linesOfCode / maxLOC, 0.15)

    return {
      x: padding + xNorm * innerW,
      y: padding + (1 - yNorm) * innerH, // invert Y so high score is at top
      r: Math.max(12, rNorm * 30),
      data: t,
    }
  })
}

// ── Smell name formatting ──────────────────────────────────────────

const SMELL_LABELS: Record<string, string> = {
  'no-assertions': 'No Assertions',
  'eager-test': 'Eager Test',
  'empty-test': 'Empty Test',
  'excessive-mocking': 'Excessive Mocking',
  'conditional-assertion': 'Conditional Assertion',
  'tautological': 'Tautological',
  'no-await-async': 'Missing Await',
  'flaky-indicator': 'Flaky Indicator',
  'console-noise': 'Console Noise',
}

function smellLabel(type: string): string {
  return SMELL_LABELS[type] || type.replace(/-/g, ' ')
}

// ── Components ─────────────────────────────────────────────────────

function SummaryBar(data: TestQualityData): HTMLElement {
  const scoreColor_ = scoreColor(data.avgScore ?? 0)
  return h('div', { className: 'tq-summary' },
    h('div', { className: 'tq-stat' },
      h('div', { className: 'tq-stat-value', style: { color: scoreColor_ } }, String(data.avgScore ?? 0)),
      h('div', { className: 'tq-stat-label' }, 'Avg Score'),
    ),
    h('div', { className: 'tq-stat' },
      h('div', { className: 'tq-stat-value' }, String(data.totalTests ?? 0)),
      h('div', { className: 'tq-stat-label' }, 'Total Tests'),
    ),
    h('div', { className: 'tq-stat' },
      h('div', { className: 'tq-stat-value', style: { color: GRADE_COLORS.A } }, String(data.strongTests ?? 0)),
      h('div', { className: 'tq-stat-label' }, 'Strong'),
    ),
    h('div', { className: 'tq-stat' },
      h('div', { className: 'tq-stat-value', style: { color: GRADE_COLORS.F } }, String(data.weakTests ?? 0)),
      h('div', { className: 'tq-stat-label' }, 'Weak'),
    ),
    h('div', { className: 'tq-stat' },
      h('div', { className: 'tq-stat-value' }, String(data.totalFiles ?? 0)),
      h('div', { className: 'tq-stat-label' }, 'Test Files'),
    ),
    ...(data.gradeDistribution ? [
      h('div', { className: 'tq-stat' },
        h('div', { style: { display: 'flex', justifyContent: 'center', gap: '4px' } },
          ...(['A', 'B', 'C', 'D', 'F'] as const).map(g =>
            h('span', {
              style: { color: gradeColor(g), fontWeight: '700', fontSize: '14px' },
            }, `${g}:${data.gradeDistribution![g]}`),
          ),
        ),
        h('div', { className: 'tq-stat-label' }, 'Grade Distribution'),
      ),
    ] : []),
  )
}

function TreemapView(
  files: TestFileAnalysis[],
  onFileClick: (file: TestFileAnalysis) => void,
): HTMLElement {
  const W = 900
  const H = 400
  const rects = layoutTreemap(files, W, H)

  const container = h('div', { className: 'tq-treemap-container', style: { width: '100%', paddingBottom: `${(H / W) * 100}%` } })

  for (const rect of rects) {
    const f = rect.data
    const pctX = (rect.x / W) * 100
    const pctY = (rect.y / H) * 100
    const pctW = (rect.w / W) * 100
    const pctH = (rect.h / H) * 100

    const showLabel = pctW > 8 && pctH > 8
    const showGrade = pctW > 5 && pctH > 5

    const cell = h('div', {
      className: 'tq-treemap-cell',
      style: {
        left: `${pctX}%`,
        top: `${pctY}%`,
        width: `${pctW}%`,
        height: `${pctH}%`,
        background: gradeColor(f.grade),
        opacity: String(0.6 + (f.qualityScore / 100) * 0.4),
      },
      title: `${f.filePath}\nScore: ${f.qualityScore} (${f.grade})\nTests: ${f.totalTests} (${f.weakTests} weak)`,
      onClick: () => onFileClick(f),
    },
      showGrade ? h('div', { className: 'tq-treemap-grade' }, f.grade) : null,
      showLabel ? h('div', { className: 'tq-treemap-label' }, f.filePath.split('/').pop() || f.filePath) : null,
    )
    container.appendChild(cell)
  }

  return container
}

function BubbleView(
  file: TestFileAnalysis,
  onTestClick: (test: TestCaseAnalysis) => void,
): HTMLElement {
  const W = 900
  const H = 360
  const bubbles = layoutBubbles(file.tests, W, H)

  const area = h('div', {
    className: 'tq-bubble-area',
    style: { width: '100%', paddingBottom: `${(H / W) * 100}%`, position: 'relative' },
  })

  // Axis labels
  area.appendChild(h('div', { className: 'tq-axis-label', style: { bottom: '4px', left: '50%', transform: 'translateX(-50%)' } }, 'Assertions →'))
  area.appendChild(h('div', { className: 'tq-axis-label', style: { top: '4px', left: '8px' } }, 'Quality ↑'))
  area.appendChild(h('div', { className: 'tq-axis-label', style: { bottom: '4px', left: '8px' } }, 'Quality ↓'))

  for (const b of bubbles) {
    const pctX = (b.x / W) * 100
    const pctY = (b.y / H) * 100
    const pctR = (b.r / W) * 100

    const bubble = h('div', {
      className: 'tq-bubble',
      style: {
        left: `calc(${pctX}% - ${b.r}px)`,
        top: `calc(${pctY}% - ${b.r}px)`,
        width: `${b.r * 2}px`,
        height: `${b.r * 2}px`,
        background: scoreColor(b.data.qualityScore),
      },
      title: `${b.data.name}\nScore: ${b.data.qualityScore} (${b.data.grade})\nAssertions: ${b.data.assertions}\nMocks: ${b.data.mocks}`,
      onClick: () => onTestClick(b.data),
    }, b.data.grade)

    area.appendChild(bubble)
  }

  return area
}

function DetailPanel(test: TestCaseAnalysis, filePath: string): HTMLElement {
  return h('div', { className: 'tq-detail-panel' },
    // Header
    h('div', { className: 'tq-detail-header' },
      h('div', { className: 'tq-detail-grade', style: { background: gradeColor(test.grade) } }, test.grade),
      h('div', null,
        h('div', { className: 'tq-detail-name' }, test.name),
        h('div', { className: 'tq-detail-path' }, `${filePath}:${test.line}`),
      ),
    ),
    // Dimensions
    h('div', { className: 'tq-detail-dims' },
      h('div', { className: 'tq-dim' },
        h('div', { className: 'tq-dim-value', style: { color: scoreColor(test.qualityScore) } }, String(test.qualityScore)),
        h('div', { className: 'tq-dim-label' }, 'Quality Score'),
      ),
      h('div', { className: 'tq-dim' },
        h('div', { className: 'tq-dim-value', style: { color: test.assertions === 0 ? GRADE_COLORS.F : GRADE_COLORS.A } }, String(test.assertions)),
        h('div', { className: 'tq-dim-label' }, 'Assertions'),
      ),
      h('div', { className: 'tq-dim' },
        h('div', { className: 'tq-dim-value', style: { color: test.mocks > 5 ? GRADE_COLORS.D : 'var(--text, #eee)' } }, String(test.mocks)),
        h('div', { className: 'tq-dim-label' }, 'Mocks'),
      ),
      h('div', { className: 'tq-dim' },
        h('div', { className: 'tq-dim-value' }, String(test.linesOfCode)),
        h('div', { className: 'tq-dim-label' }, 'Lines of Code'),
      ),
    ),
    // Smells
    ...(test.smells.length > 0 ? [
      h('div', { style: { fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text, #eee)' } },
        `Issues Found (${test.smells.length})`),
      h('ul', { className: 'tq-smell-list' },
        ...test.smells.map(smell =>
          h('li', { className: `tq-smell-${smell.severity}` },
            h('span', {
              className: 'tq-smell-badge',
              style: {
                background: smell.severity === 'error' ? 'rgba(239,68,68,0.2)' :
                  smell.severity === 'warning' ? 'rgba(234,179,8,0.2)' : 'rgba(96,165,250,0.2)',
              },
            }, smell.severity),
            h('span', null, smell.message),
          ),
        ),
      ),
    ] : [
      h('div', { style: { fontSize: '13px', color: GRADE_COLORS.A, padding: '8px 0' } },
        'No issues detected — this test looks solid'),
    ]),
  )
}

function SmellsOverview(smellSummary: Record<string, number>): HTMLElement {
  const entries = Object.entries(smellSummary).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return h('div', null)

  return h('div', null,
    h('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text, #eee)', marginTop: '20px', marginBottom: '8px' } },
      'Most Common Issues'),
    h('div', { className: 'tq-smells-overview' },
      ...entries.map(([type, count]) =>
        h('div', { className: 'tq-smell-chip' },
          h('span', { className: 'tq-smell-chip-count' }, String(count)),
          h('span', null, smellLabel(type)),
        ),
      ),
    ),
  )
}

function Legend(): HTMLElement {
  return h('div', { className: 'tq-legend' },
    ...(['A', 'B', 'C', 'D', 'F'] as const).map(g =>
      h('div', { className: 'tq-legend-item' },
        h('div', { className: 'tq-legend-color', style: { background: gradeColor(g) } }),
        h('span', null, g),
      ),
    ),
    h('span', { style: { marginLeft: '8px' } }, '(size = number of tests)'),
  )
}

// ── Main Tab ───────────────────────────────────────────────────────

type View = { kind: 'treemap' } | { kind: 'bubbles'; file: TestFileAnalysis } | { kind: 'detail'; file: TestFileAnalysis; test: TestCaseAnalysis }

export function TestQualityTab(): { element: HTMLElement; activate: () => void } {
  const data = signal<TestQualityData | null>(null)
  const view = signal<View>({ kind: 'treemap' })
  let loaded = false

  function activate() {
    if (loaded) return
    loaded = true
    fetch('/api/testquality')
      .then(r => r.json())
      .then(json => {
        if (!json.error) data.set(json)
      })
      .catch(() => {})
  }

  const container = h('div', { id: 'testquality-content' })

  effect(() => {
    const d = data()
    const v = view()
    container.innerHTML = ''

    if (!d || !d.files || d.files.length === 0) {
      container.appendChild(
        h('div', { className: 'tq-no-data' },
          h('h2', null, 'No test quality data yet'),
          h('p', null, 'Run the collector to analyze your tests:'),
          h('code', null, 'pnpm collect testquality'),
          h('p', { style: { marginTop: '12px', fontSize: '13px' } },
            'This scans your test files for assertion density, test smells, and quality patterns.'),
        ),
      )
      return
    }

    // Summary bar (always visible)
    container.appendChild(SummaryBar(d))

    // Breadcrumb navigation
    if (v.kind !== 'treemap') {
      const crumb = h('div', { className: 'tq-breadcrumb' })
      crumb.appendChild(h('button', { onClick: () => view.set({ kind: 'treemap' }) }, 'All Files'))

      if (v.kind === 'bubbles' || v.kind === 'detail') {
        crumb.appendChild(h('span', null, ' / '))
        if (v.kind === 'detail') {
          crumb.appendChild(h('button', {
            onClick: () => view.set({ kind: 'bubbles', file: v.file }),
          }, v.file.filePath.split('/').pop() || v.file.filePath))
          crumb.appendChild(h('span', null, ' / '))
          crumb.appendChild(h('span', { style: { color: 'var(--text, #eee)' } }, v.test.name))
        } else {
          crumb.appendChild(h('span', { style: { color: 'var(--text, #eee)' } },
            v.file.filePath.split('/').pop() || v.file.filePath))
        }
      }
      container.appendChild(crumb)
    }

    // Main view
    if (v.kind === 'treemap') {
      container.appendChild(Legend())
      container.appendChild(TreemapView(d.files, (file) => {
        view.set({ kind: 'bubbles', file })
      }))
      if (d.smellSummary) {
        container.appendChild(SmellsOverview(d.smellSummary))
      }
    } else if (v.kind === 'bubbles') {
      container.appendChild(
        h('div', { style: { fontSize: '13px', color: 'var(--text-dim, #888)', marginBottom: '8px' } },
          `${v.file.totalTests} tests — Score: ${v.file.qualityScore}/100 (${v.file.grade}) — Click a bubble for details`),
      )
      container.appendChild(BubbleView(v.file, (test) => {
        view.set({ kind: 'detail', file: v.file, test })
      }))
    } else if (v.kind === 'detail') {
      container.appendChild(DetailPanel(v.test, v.file.filePath))
    }
  })

  return {
    element: h('div', { id: 'tab-test-quality', className: `tab-content ${styles}` }, container),
    activate,
  }
}
