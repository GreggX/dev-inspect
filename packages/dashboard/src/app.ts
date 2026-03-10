import { h } from './core/dom.js'
import { Header } from './components/header.js'
import { TabBar, type TabId } from './components/tab-bar.js'
import { MetricsTab } from './tabs/metrics.js'
import { UIHealthTab } from './tabs/ui-health.js'
import { TrendsTab } from './tabs/trends.js'
import { SettingsTab } from './tabs/settings.js'
import { TestQualityTab } from './tabs/test-quality.js'
import { useMetrics } from './hooks/use-metrics.js'

export function App(): HTMLElement {
  const metrics = useMetrics()

  const uiHealth = UIHealthTab()
  const trends = TrendsTab()
  const testQuality = TestQualityTab()
  const settings = SettingsTab()

  const metricsTab = MetricsTab(metrics)
  const uiHealthTab = uiHealth.element
  const trendsTab = trends.element
  const testQualityTab = testQuality.element
  const settingsTab = settings.element

  const tabContents: Record<TabId, HTMLElement> = {
    'metrics': metricsTab,
    'ui-health': uiHealthTab,
    'trends': trendsTab,
    'test-quality': testQualityTab,
    'settings': settingsTab,
  }

  const { element: tabBar } = TabBar(
    [
      { id: 'metrics', label: 'Metrics' },
      { id: 'ui-health', label: 'UI Health' },
      { id: 'trends', label: 'Trends' },
      { id: 'test-quality', label: 'Test Quality' },
      { id: 'settings', label: 'Settings' },
    ],
    (tab: TabId) => {
      // Toggle tab content visibility
      for (const [id, el] of Object.entries(tabContents)) {
        if (id === tab) {
          el.classList.add('active')
        } else {
          el.classList.remove('active')
        }
      }

      // Activate hooks
      if (tab === 'ui-health') {
        uiHealth.activate()
      } else {
        uiHealth.deactivate()
      }

      if (tab === 'trends') {
        trends.activate()
      }

      if (tab === 'test-quality') {
        testQuality.activate()
      }

      if (tab === 'settings') {
        settings.activate()
      }
    },
  )

  return h('div', null,
    Header(metrics),
    tabBar,
    metricsTab,
    uiHealthTab,
    trendsTab,
    testQualityTab,
    settingsTab,
  )
}
