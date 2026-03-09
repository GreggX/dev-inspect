import { h } from '../core/dom.js'
import { effect } from '../core/state.js'
import { useHistory, type HistoryEntry } from '../hooks/use-history.js'

function formatDate(ts: string): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Renders an inline SVG mini-chart (sparkline) from data points.
 */
function sparkline(
  values: number[],
  opts: { width?: number; height?: number; color?: string; label?: string } = {},
): HTMLElement {
  const { width = 280, height = 60, color = '#818cf8', label } = opts
  if (values.length < 2) {
    return h('div', {
      style: { fontSize: '11px', color: 'var(--text-dim)', padding: '8px 0' },
    }, 'Not enough data points yet.')
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padY = 4

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - padY - ((v - min) / range) * (height - padY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const latest = values[values.length - 1]
  const prev = values[values.length - 2]
  const diff = latest - prev
  const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)
  const diffColor = diff >= 0 ? 'var(--pass)' : 'var(--fail)'

  const container = h('div', { style: { marginBottom: '16px' } })

  if (label) {
    const headerEl = h('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' },
    },
      h('span', { style: { fontSize: '11px', fontWeight: '600', color: 'var(--text)' } }, label),
      h('span', { style: { fontSize: '11px' } },
        h('span', { style: { color: 'var(--text)' } }, String(latest)),
        h('span', { style: { color: diffColor, marginLeft: '6px', fontSize: '10px' } }, `(${diffStr})`),
      ),
    )
    container.appendChild(headerEl)
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.style.display = 'block'

  // Fill area
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  const areaPoints = `0,${height} ${points} ${width},${height}`
  area.setAttribute('points', areaPoints)
  area.setAttribute('fill', color)
  area.setAttribute('fill-opacity', '0.1')
  svg.appendChild(area)

  // Line
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', points)
  polyline.setAttribute('fill', 'none')
  polyline.setAttribute('stroke', color)
  polyline.setAttribute('stroke-width', '2')
  polyline.setAttribute('stroke-linejoin', 'round')
  svg.appendChild(polyline)

  // Latest point dot
  const lastX = width
  const lastY = height - padY - ((latest - min) / range) * (height - padY * 2)
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  dot.setAttribute('cx', lastX.toFixed(1))
  dot.setAttribute('cy', lastY.toFixed(1))
  dot.setAttribute('r', '3')
  dot.setAttribute('fill', color)
  svg.appendChild(dot)

  container.appendChild(svg)
  return container
}

/**
 * Renders a status timeline (pass/fail over time).
 */
function statusTimeline(
  entries: { timestamp: string; status: string }[],
  label: string,
): HTMLElement {
  const container = h('div', { style: { marginBottom: '16px' } })
  container.appendChild(
    h('div', {
      style: { fontSize: '11px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' },
    }, label),
  )

  if (entries.length === 0) {
    container.appendChild(h('div', {
      style: { fontSize: '11px', color: 'var(--text-dim)' },
    }, 'No data yet.'))
    return container
  }

  const row = h('div', {
    style: { display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap' },
  })

  for (const e of entries.slice(-30)) {
    const color = e.status === 'pass' ? 'var(--pass)' : e.status === 'fail' ? 'var(--fail)' : 'var(--text-dim)'
    const block = h('div', {
      style: {
        width: '8px',
        height: '20px',
        borderRadius: '2px',
        background: color,
        opacity: '0.8',
      },
      title: `${formatDate(e.timestamp)}: ${e.status}`,
    })
    row.appendChild(block)
  }

  container.appendChild(row)

  // Legend
  const latest = entries[entries.length - 1]
  const passCount = entries.filter(e => e.status === 'pass').length
  container.appendChild(h('div', {
    style: { fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' },
  }, `${passCount}/${entries.length} passed — latest: ${latest.status}`))

  return container
}

export function TrendsTab(): {
  element: HTMLElement
  activate: () => void
} {
  const { history, loadHistory } = useHistory()

  const chartsContainer = h('div', null)

  effect(() => {
    const data = history()
    chartsContainer.innerHTML = ''

    if (data.length === 0) {
      chartsContainer.appendChild(h('div', { className: 'empty-state' },
        h('p', { style: { color: 'var(--text-dim)', fontSize: '12px' } },
          'No history data yet. Run `dev-inspect collect` at least twice to see trends.',
        ),
      ))
      return
    }

    // Coverage sparkline
    const coverageData = data.filter(d => d.coverage?.lines != null).map(d => d.coverage!.lines!)
    if (coverageData.length > 0) {
      chartsContainer.appendChild(sparkline(coverageData, { label: 'Line Coverage %', color: '#34d399' }))
    }

    // Test results sparkline (passed count)
    const testData = data.filter(d => d.tests.passed != null).map(d => d.tests.passed!)
    if (testData.length > 0) {
      chartsContainer.appendChild(sparkline(testData, { label: 'Tests Passed', color: '#818cf8' }))
    }

    // Bundle size sparkline
    const bundleData = data.filter(d => d.bundlesize?.totalBytes != null).map(d => d.bundlesize!.totalBytes! / 1024)
    if (bundleData.length > 0) {
      chartsContainer.appendChild(sparkline(bundleData, { label: 'Bundle Size (KB)', color: '#fbbf24' }))
    }

    // Type coverage sparkline
    const typeCovData = data.filter(d => d.typecoverage?.percentage != null).map(d => d.typecoverage!.percentage!)
    if (typeCovData.length > 0) {
      chartsContainer.appendChild(sparkline(typeCovData, { label: 'Type Coverage %', color: '#60a5fa' }))
    }

    // TODOs sparkline
    const todoData = data.filter(d => d.todos?.total != null).map(d => d.todos!.total!)
    if (todoData.length > 0) {
      chartsContainer.appendChild(sparkline(todoData, { label: 'TODOs', color: '#f87171' }))
    }

    // Secrets sparkline
    const secretsData = data.filter(d => d.secrets?.findings != null).map(d => d.secrets!.findings!)
    if (secretsData.length > 0) {
      chartsContainer.appendChild(sparkline(secretsData, { label: 'Secrets Found', color: '#ef4444' }))
    }

    // Status timelines
    chartsContainer.appendChild(h('div', {
      style: { borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' },
    }))

    chartsContainer.appendChild(statusTimeline(
      data.map(d => ({ timestamp: d.timestamp, status: d.lint.status })),
      'Lint Status',
    ))

    chartsContainer.appendChild(statusTimeline(
      data.map(d => ({ timestamp: d.timestamp, status: d.typecheck.status })),
      'TypeScript Status',
    ))

    chartsContainer.appendChild(statusTimeline(
      data.map(d => ({ timestamp: d.timestamp, status: d.build.status })),
      'Build Status',
    ))

    chartsContainer.appendChild(statusTimeline(
      data.map(d => ({ timestamp: d.timestamp, status: d.tests.status })),
      'Tests Status',
    ))

    // Summary stats
    const latest = data[data.length - 1]
    const first = data[0]
    const summaryItems: string[] = []

    if (latest.coverage?.lines != null && first.coverage?.lines != null) {
      const diff = latest.coverage.lines - first.coverage.lines
      summaryItems.push(`Coverage: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% since first run`)
    }
    if (latest.bundlesize?.totalBytes != null && first.bundlesize?.totalBytes != null) {
      const diffKb = (latest.bundlesize.totalBytes - first.bundlesize.totalBytes) / 1024
      summaryItems.push(`Bundle: ${diffKb >= 0 ? '+' : ''}${diffKb.toFixed(1)}KB since first run`)
    }

    if (summaryItems.length > 0) {
      chartsContainer.appendChild(h('div', {
        style: {
          borderTop: '1px solid var(--border)',
          paddingTop: '12px',
          marginTop: '8px',
        },
      },
        h('div', {
          style: { fontSize: '11px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' },
        }, 'Overall Trend'),
        ...summaryItems.map(s => h('div', {
          style: { fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' },
        }, s)),
        h('div', {
          style: { fontSize: '10px', color: 'var(--text-dim)', marginTop: '6px' },
        }, `${data.length} data points from ${formatDate(first.timestamp)} to ${formatDate(latest.timestamp)}`),
      ))
    }
  })

  const element = h('div', { id: 'tab-trends', className: 'tab-content' },
    h('div', { style: { padding: '20px', maxWidth: '600px' } },
      h('h2', { style: { fontSize: '14px', color: 'var(--text)', marginBottom: '16px' } }, 'Trends'),
      chartsContainer,
    ),
  )

  function activate() {
    loadHistory()
  }

  return { element, activate }
}
