import { h } from '../core/dom.js'

function coverageColor(pct: number): string {
  if (pct >= 80) return 'var(--pass)'
  if (pct >= 60) return 'var(--warn)'
  return 'var(--fail)'
}

export function CoverageRing(pct: number, label: string): HTMLElement {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = coverageColor(pct)

  // Use innerHTML for SVG since h() with SVG namespacing is tricky
  const ringDiv = h('div', { className: 'coverage-ring' })
  ringDiv.innerHTML = `
    <svg viewBox="0 0 72 72">
      <circle class="bg" cx="36" cy="36" r="${r}" fill="none" stroke-width="6" />
      <circle class="fg" cx="36" cy="36" r="${r}" fill="none" stroke-width="6"
        stroke="${color}"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${offset}"
        stroke-linecap="round" />
    </svg>
    <div class="coverage-pct" style="color: ${color}">${pct}%</div>
  `

  return h('div', { className: 'coverage-item' },
    h('div', { className: 'label' }, label),
    ringDiv,
  )
}

export interface CoverageSummaryData {
  lines: { pct: number }
  branches: { pct: number }
  functions: { pct: number }
  statements: { pct: number }
}

export function CoverageSection(summary: CoverageSummaryData): HTMLElement {
  return h('div', null,
    h('div', { className: 'section-title' }, 'Test Coverage'),
    h('div', { className: 'card', style: { marginBottom: '24px' } },
      h('div', { className: 'coverage-grid' },
        CoverageRing(summary.lines.pct, 'Lines'),
        CoverageRing(summary.branches.pct, 'Branches'),
        CoverageRing(summary.functions.pct, 'Functions'),
        CoverageRing(summary.statements.pct, 'Statements'),
      ),
    ),
  )
}
