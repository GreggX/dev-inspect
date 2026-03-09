import { h } from '../core/dom.js'
import type { LicenseResult } from '../hooks/use-metrics.js'

export function LicenseCard(data: LicenseResult): HTMLElement {
  const total = data.total ?? 0
  const highRisk = data.risk?.filter((r) => r.level === 'high') ?? []
  const hasHighRisk = highRisk.length > 0
  const effectiveStatus = hasHighRisk ? 'fail' : data.status

  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, 'Licenses'),
      h('span', { className: `status-badge status-${effectiveStatus}` }, effectiveStatus),
    ),
    h('div', {
      className: 'card-value',
      style: { color: hasHighRisk ? 'var(--fail)' : 'var(--text)' },
    }, `${total} deps`),
    h('div', { className: 'card-detail' },
      hasHighRisk ? `${highRisk.length} high-risk license(s)` : 'All licenses OK',
    ),
  ]

  // Risk list
  if (data.risk && data.risk.length > 0) {
    const ul = h('ul', { className: 'detail-list' })
    for (const item of data.risk) {
      ul.appendChild(
        h('li', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          h('span', { className: `risk-badge risk-${item.level}` }, item.level),
          h('span', null, item.name),
          h('span', { style: { color: 'var(--text-dim)' } }, item.license),
        ),
      )
    }
    children.push(ul)
  }

  // License summary tags
  if (data.summary) {
    const entries = Object.entries(data.summary).sort((a, b) => b[1] - a[1])
    const tagContainer = h('div', { className: 'license-summary' })
    for (const [license, count] of entries) {
      tagContainer.appendChild(
        h('span', { className: 'license-tag' }, `${license}: ${count}`),
      )
    }
    children.push(tagContainer)
  }

  if (data.error) {
    children.push(h('div', { className: 'error-output' }, data.error))
  }

  return h('div', { className: 'card' }, ...children)
}
