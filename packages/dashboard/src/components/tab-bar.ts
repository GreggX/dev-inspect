import { h } from '../core/dom.js'
import { signal, type Signal } from '../core/state.js'

export type TabId = 'metrics' | 'ui-health' | 'trends' | 'test-quality' | 'settings'

export interface TabBarResult {
  element: HTMLElement
  activeTab: Signal<TabId>
}

export function TabBar(
  tabs: { id: TabId; label: string }[],
  onChange?: (tab: TabId) => void,
): TabBarResult {
  const activeTab = signal<TabId>('metrics')
  const buttons: HTMLButtonElement[] = []

  const container = h('div', { className: 'tabs' })

  for (const tab of tabs) {
    const btn = h('button', {
      className: tab.id === 'metrics' ? 'tab active' : 'tab',
      dataset: { tab: tab.id },
      onClick: () => {
        activeTab.set(tab.id)
        for (const b of buttons) {
          b.classList.toggle('active', b.dataset.tab === tab.id)
        }
        if (onChange) onChange(tab.id)
      },
    }, tab.label) as HTMLButtonElement

    buttons.push(btn)
    container.appendChild(btn)
  }

  return { element: container, activeTab }
}
