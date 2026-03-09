import { h } from '../core/dom.js'
import type { TypeCoverageResult } from '../hooks/use-metrics.js'

function coverageColor(pct: number): string {
  if (pct >= 90) return 'var(--pass)'
  if (pct >= 70) return 'var(--warn)'
  return 'var(--fail)'
}

export function TypeCoverageCard(data: TypeCoverageResult): HTMLElement {
  const pct = data.percentage ?? 0
  const color = coverageColor(pct)

  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, 'Type Coverage'),
      h('span', { className: `status-badge status-${data.status}` }, data.status),
    ),
    h('div', { className: 'card-value', style: { color } },
      `${pct.toFixed(1)}%`,
    ),
  ]

  // Detail line
  const parts: string[] = []
  if (data.anyCount != null) parts.push(`${data.anyCount} any`)
  if (data.totalIdentifiers != null) parts.push(`${data.totalIdentifiers} identifiers`)
  if (parts.length > 0) {
    children.push(h('div', { className: 'card-detail' }, parts.join(' / ')))
  }

  if (data.error) {
    children.push(h('div', { className: 'error-output' }, data.error))
  }

  return h('div', { className: 'card' }, ...children)
}
