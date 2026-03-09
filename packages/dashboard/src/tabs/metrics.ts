import { h } from '../core/dom.js'
import { effect, type Signal } from '../core/state.js'
import { StatusCard } from '../components/status-card.js'
import { CoverageSection } from '../components/coverage-ring.js'
import { GitInfo } from '../components/git-info.js'
import { BundleCard } from '../components/bundle-card.js'
import { TodosCard } from '../components/todos-card.js'
import { SecretsCard } from '../components/secrets-card.js'
import { LicenseCard } from '../components/license-card.js'
import { TypeCoverageCard } from '../components/type-coverage-card.js'
import type { Metrics } from '../hooks/use-metrics.js'

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function noDataView(): HTMLElement {
  return h('div', { className: 'no-data' },
    h('h2', null, 'No metrics collected yet'),
    h('p', null, 'Run the collector to get started:'),
    h('code', null, 'cd tools/dev-dashboard && pnpm collect'),
  )
}

function renderMetrics(m: Metrics): HTMLElement {
  const container = h('div', null)

  // Status cards grid
  const grid = h('div', { className: 'grid' },
    StatusCard({
      title: 'ESLint',
      status: m.lint.status,
      value: m.lint.status === 'pass' ? 'Clean' : 'Issues',
      detail: formatDuration(m.lint.duration_ms) + (m.lint.output ? ' \u2014 ' + m.lint.output : ''),
      error: m.lint.error,
    }),
    StatusCard({
      title: 'TypeScript',
      status: m.typecheck.status,
      value: m.typecheck.status === 'pass' ? 'No Errors' : 'Type Errors',
      detail: formatDuration(m.typecheck.duration_ms) + (m.typecheck.output ? ' \u2014 ' + m.typecheck.output : ''),
      error: m.typecheck.error,
    }),
    StatusCard({
      title: 'Tests',
      status: m.tests.status,
      value: `${m.tests.passed ?? '?'}`,
      detail: formatDuration(m.tests.duration_ms) + (m.tests.failed ? ` \u2014 ${m.tests.failed} failed` : ''),
      error: m.tests.error,
    }),
    StatusCard({
      title: 'Build',
      status: m.build.status,
      value: m.build.status === 'pass' ? 'Success' : 'Failed',
      detail: formatDuration(m.build.duration_ms),
      error: m.build.error,
    }),
  )

  // Fix the Tests card value to include the total with styling
  const testsCard = grid.children[2]
  const testsValue = testsCard.querySelector('.card-value')
  if (testsValue) {
    testsValue.innerHTML = ''
    testsValue.appendChild(document.createTextNode(String(m.tests.passed ?? '?')))
    const totalSpan = h('span', { style: { color: 'var(--text-dim)', fontSize: '16px' } },
      ` / ${m.tests.total ?? '?'}`,
    )
    testsValue.appendChild(totalSpan)
  }

  container.appendChild(grid)

  // Coverage
  if (m.coverage?.summary) {
    container.appendChild(CoverageSection(m.coverage.summary))
  }

  // --- Code Health section ---
  const codeHealthCards: HTMLElement[] = []

  if (m.bundlesize) {
    codeHealthCards.push(BundleCard(m.bundlesize))
  }

  if (m.complexity) {
    const cx = m.complexity
    const loc = cx.totalLines != null ? `${cx.totalLines.toLocaleString()} LOC` : 'N/A'
    const detailParts: string[] = []
    if (cx.totalFiles != null) detailParts.push(`${cx.totalFiles} files`)
    if (cx.avgLines != null) detailParts.push(`avg ${cx.avgLines} lines/file`)
    if (cx.functionCount != null) detailParts.push(`${cx.functionCount} functions`)
    codeHealthCards.push(StatusCard({
      title: 'Complexity',
      status: cx.status,
      value: loc,
      detail: detailParts.join(', '),
      error: cx.error,
    }))
  }

  if (m.typecoverage) {
    codeHealthCards.push(TypeCoverageCard(m.typecoverage))
  }

  if (m.todos) {
    codeHealthCards.push(TodosCard(m.todos))
  }

  if (codeHealthCards.length > 0) {
    const codeHealthGrid = h('div', { className: 'grid' })
    for (const card of codeHealthCards) {
      codeHealthGrid.appendChild(card)
    }
    container.appendChild(
      h('div', { className: 'metric-section' },
        h('hr', { className: 'section-divider' }),
        h('div', { className: 'section-title' }, 'Code Health'),
        codeHealthGrid,
      ),
    )
  }

  // --- Security & Compliance section ---
  const securityCards: HTMLElement[] = []

  if (m.secrets) {
    securityCards.push(SecretsCard(m.secrets))
  }

  if (m.licenses) {
    securityCards.push(LicenseCard(m.licenses))
  }

  if (m.envcheck) {
    const env = m.envcheck
    const missingCount = env.missing?.length ?? 0
    const extraCount = env.extra?.length ?? 0
    const val = missingCount === 0 ? 'Synced' : `${missingCount} Missing`
    const detailParts: string[] = []
    if (env.missing && env.missing.length > 0) {
      detailParts.push('Missing: ' + env.missing.join(', '))
    }
    if (env.extra && env.extra.length > 0) {
      detailParts.push('Extra: ' + env.extra.join(', '))
    }
    securityCards.push(StatusCard({
      title: 'Env Check',
      status: env.status,
      value: val,
      detail: detailParts.join(' | ') || (extraCount > 0 ? `${extraCount} extra vars` : 'All env vars accounted for'),
      error: env.error,
      valueStyle: missingCount > 0 ? { color: 'var(--fail)' } : { color: 'var(--pass)' },
    }))
  }

  if (m.duplicates) {
    const dup = m.duplicates
    const count = dup.count ?? 0
    const detailParts: string[] = []
    if (dup.packages && dup.packages.length > 0) {
      for (const pkg of dup.packages.slice(0, 5)) {
        detailParts.push(`${pkg.name} (${pkg.versions.join(', ')})`)
      }
      if (dup.packages.length > 5) {
        detailParts.push(`... and ${dup.packages.length - 5} more`)
      }
    }
    securityCards.push(StatusCard({
      title: 'Duplicate Deps',
      status: dup.status,
      value: String(count),
      detail: detailParts.join('; ') || 'No duplicate packages',
      error: dup.error,
      valueStyle: count > 0 ? { color: 'var(--warn)' } : { color: 'var(--pass)' },
    }))
  }

  if (securityCards.length > 0) {
    const securityGrid = h('div', { className: 'grid' })
    for (const card of securityCards) {
      securityGrid.appendChild(card)
    }
    container.appendChild(
      h('div', { className: 'metric-section' },
        h('hr', { className: 'section-divider' }),
        h('div', { className: 'section-title' }, 'Security & Compliance'),
        securityGrid,
      ),
    )
  }

  // Git
  container.appendChild(h('hr', { className: 'section-divider' }))
  container.appendChild(GitInfo(m.git))

  // Dependencies
  const depsSection = h('div', null,
    h('div', { className: 'section-title', style: { marginTop: '24px' } }, 'Dependencies'),
    h('div', { className: 'grid' },
      h('div', { className: 'card' },
        h('div', { className: 'card-header' },
          h('span', { className: 'card-title' }, 'Outdated'),
        ),
        h('div', {
          className: 'card-value',
          style: { color: m.dependencies.outdated > 10 ? 'var(--warn)' : 'var(--text)' },
        }, String(m.dependencies.outdated)),
        h('div', { className: 'card-detail' }, 'packages need updates'),
      ),
      h('div', { className: 'card' },
        h('div', { className: 'card-header' },
          h('span', { className: 'card-title' }, 'Vulnerabilities'),
        ),
        h('div', {
          className: 'card-value',
          style: { color: m.dependencies.vulnerabilities > 0 ? 'var(--fail)' : 'var(--pass)' },
        }, String(m.dependencies.vulnerabilities)),
        h('div', { className: 'card-detail' }, 'security issues'),
      ),
    ),
  )
  container.appendChild(depsSection)

  // Timestamp
  container.appendChild(
    h('div', { className: 'timestamp' }, `Last collected: ${new Date(m.timestamp).toLocaleString()}`),
  )

  return container
}

export function MetricsTab(metrics: Signal<Metrics | null>): HTMLElement {
  const container = h('div', { id: 'metrics-content' })

  effect(() => {
    const m = metrics()
    container.innerHTML = ''
    if (!m) {
      container.appendChild(noDataView())
    } else {
      container.appendChild(renderMetrics(m))
    }
  })

  return h('div', { id: 'tab-metrics', className: 'tab-content active' }, container)
}
