import { h } from '../core/dom.js'
import { effect, type Signal } from '../core/state.js'
import type { Metrics } from '../hooks/use-metrics.js'

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  return `${hrs}h ${min % 60}m ago`
}

export function Header(metrics: Signal<Metrics | null>): HTMLElement {
  const metaContainer = h('div', { className: 'meta' })

  effect(() => {
    const m = metrics()
    if (!m) {
      metaContainer.innerHTML = ''
      return
    }
    metaContainer.innerHTML = ''
    metaContainer.appendChild(
      h('div', { className: 'branch' }, m.git.branch),
    )
    metaContainer.appendChild(
      h('div', null, timeAgo(m.timestamp)),
    )
    metaContainer.appendChild(
      h('div', { className: 'live-dot', title: 'Auto-refreshing' }),
    )
  })

  return h('header', null,
    h('h1', null,
      h('span', null, 'cielo'),
      ' dev dashboard',
    ),
    metaContainer,
  )
}
