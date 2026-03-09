import { h } from '../core/dom.js'
import type { TodoResult } from '../hooks/use-metrics.js'

export function TodosCard(data: TodoResult): HTMLElement {
  const total = data.total ?? 0
  const bd = data.breakdown

  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, 'TODOs'),
      h('span', { className: `status-badge status-${data.status}` }, data.status),
    ),
    h('div', { className: 'card-value', style: { color: total > 0 ? 'var(--warn)' : 'var(--pass)' } },
      String(total),
    ),
  ]

  // Breakdown line
  if (bd) {
    const parts: string[] = []
    if (bd.todo) parts.push(`${bd.todo} TODO`)
    if (bd.fixme) parts.push(`${bd.fixme} FIXME`)
    if (bd.hack) parts.push(`${bd.hack} HACK`)
    children.push(h('div', { className: 'card-detail' }, parts.join(', ')))
  }

  // Item list (first 10)
  if (data.items && data.items.length > 0) {
    const items = data.items.slice(0, 10)
    const ul = h('ul', { className: 'detail-list' })
    for (const item of items) {
      const typeColor = item.type.toLowerCase() === 'todo' ? 'var(--warn)' : 'var(--fail)'
      ul.appendChild(
        h('li', null,
          h('span', { className: 'type-label', style: { color: typeColor } }, item.type),
          ' ',
          h('span', { className: 'file-ref' }, `${item.file}:${item.line}`),
          ` ${item.text}`,
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
