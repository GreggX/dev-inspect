import { h } from '../core/dom.js'
import type { SecretsResult } from '../hooks/use-metrics.js'

export function SecretsCard(data: SecretsResult): HTMLElement {
  const findings = data.findings ?? 0
  const isCritical = findings > 0

  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, 'Secrets Detection'),
      h('span', { className: `status-badge status-${isCritical ? 'fail' : data.status}` },
        isCritical ? 'fail' : data.status,
      ),
    ),
    h('div', {
      className: 'card-value',
      style: { color: isCritical ? 'var(--fail)' : 'var(--pass)' },
    }, isCritical ? `${findings} Found` : 'Clean'),
    h('div', { className: 'card-detail' },
      isCritical ? 'Potential secrets detected in source' : 'No secrets detected',
    ),
  ]

  // Item list (first 10)
  if (data.items && data.items.length > 0) {
    const items = data.items.slice(0, 10)
    const ul = h('ul', { className: 'detail-list' })
    for (const item of items) {
      ul.appendChild(
        h('li', null,
          h('span', { className: 'file-ref' }, `${item.file}:${item.line}`),
          ' ',
          h('span', { className: 'type-label', style: { color: 'var(--fail)' } }, item.type),
        ),
      )
    }
    if (data.items.length > 10) {
      ul.appendChild(
        h('li', { style: { color: 'var(--text-dim)', fontStyle: 'italic' } },
          `... and ${data.items.length - 10} more`,
        ),
      )
    }
    children.push(ul)
  }

  if (data.error) {
    children.push(h('div', { className: 'error-output' }, data.error))
  }

  return h('div', { className: 'card' }, ...children)
}
