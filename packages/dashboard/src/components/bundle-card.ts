import { h } from '../core/dom.js'
import type { BundleSizeResult } from '../hooks/use-metrics.js'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function BundleCard(data: BundleSizeResult): HTMLElement {
  const total = data.totalBytes ?? 0
  const js = data.jsBytes ?? 0
  const css = data.cssBytes ?? 0
  const other = Math.max(0, total - js - css)

  const jsPct = total > 0 ? (js / total) * 100 : 0
  const cssPct = total > 0 ? (css / total) * 100 : 0
  const otherPct = total > 0 ? (other / total) * 100 : 0

  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, 'Bundle Size'),
      h('span', { className: `status-badge status-${data.status}` }, data.status),
    ),
    h('div', { className: 'card-value', style: { color: 'var(--accent)' } },
      formatBytes(total),
    ),
    h('div', { className: 'card-detail' },
      data.fileCount != null ? `${data.fileCount} files` : '',
    ),
  ]

  // Breakdown bar
  if (total > 0) {
    const bar = h('div', { className: 'breakdown-bar' })
    if (jsPct > 0) {
      bar.appendChild(h('div', {
        style: { width: `${jsPct}%`, background: 'var(--warn)' },
      }))
    }
    if (cssPct > 0) {
      bar.appendChild(h('div', {
        style: { width: `${cssPct}%`, background: 'var(--accent)' },
      }))
    }
    if (otherPct > 0) {
      bar.appendChild(h('div', {
        style: { width: `${otherPct}%`, background: 'var(--text-dim)' },
      }))
    }
    children.push(bar)

    const legend = h('div', {
      style: { fontSize: '10px', color: 'var(--text-dim)', display: 'flex', gap: '12px', marginTop: '4px' },
    },
      h('span', null, `JS: ${formatBytes(js)}`),
      h('span', null, `CSS: ${formatBytes(css)}`),
      other > 0 ? h('span', null, `Other: ${formatBytes(other)}`) : '',
    )
    children.push(legend)
  }

  // Largest file
  if (data.largestFile) {
    children.push(
      h('div', {
        style: { fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' },
      },
        'Largest: ',
        h('span', { style: { color: 'var(--accent)' } }, data.largestFile.name),
        ` (${formatBytes(data.largestFile.bytes)})`,
      ),
    )
  }

  if (data.error) {
    children.push(h('div', { className: 'error-output' }, data.error))
  }

  return h('div', { className: 'card' }, ...children)
}
