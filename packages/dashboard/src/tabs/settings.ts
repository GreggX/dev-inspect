import { h } from '../core/dom.js'
import { effect, signal } from '../core/state.js'
import { useConfig, CHECK_LABELS, CHECK_DEFAULTS, type CheckConfig } from '../hooks/use-config.js'

export function SettingsTab(): {
  element: HTMLElement
  activate: () => void
} {
  const { config, loaded, load, save } = useConfig()
  const settingsLoaded = signal(false)

  const checksContainer = h('div', { id: 'settings-checks' })
  const statusSpan = h('span', { style: { fontSize: '12px', color: 'var(--text-dim)' } })

  const saveBtn = h('button', {
    className: 'app-frame-btn',
    style: {
      background: 'var(--accent-dim)',
      borderColor: 'var(--accent)',
      color: 'white',
      padding: '8px 20px',
    },
    onClick: async () => {
      const checks: Record<string, CheckConfig> = {}
      for (const name of Object.keys(CHECK_LABELS)) {
        const checkbox = checksContainer.querySelector(`[data-check="${name}"]`) as HTMLInputElement | null
        const cmdInput = checksContainer.querySelector(`[data-check-cmd="${name}"]`) as HTMLInputElement | null
        checks[name] = {
          enabled: checkbox?.checked ?? false,
          command: cmdInput?.value || undefined,
        }
      }

      const result = await save(checks)
      if (result.success) {
        statusSpan.textContent = 'Saved!'
        statusSpan.style.color = 'var(--pass)'
      } else {
        statusSpan.textContent = result.error || 'Save failed'
        statusSpan.style.color = 'var(--fail)'
      }
      setTimeout(() => {
        statusSpan.textContent = ''
      }, 3000)
    },
  }, 'Save')

  const actionsDiv = h('div', {
    style: { display: 'none', marginTop: '16px' },
  },
    h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      saveBtn,
      statusSpan,
    ),
  )

  function renderChecks() {
    const cfg = config()
    const checks = cfg?.checks ?? {}

    checksContainer.innerHTML = ''

    for (const [name, label] of Object.entries(CHECK_LABELS)) {
      const check = checks[name]
      const enabled = check ? check.enabled : false
      const command = check?.command ?? CHECK_DEFAULTS[name] ?? ''

      const checkId = `check-${name}`
      const checkbox = h('input', {
        type: 'checkbox',
        id: checkId,
        dataset: { check: name },
        ...(enabled ? { checked: true } : {}),
        style: { width: '16px', height: '16px', accentColor: 'var(--accent)' },
      }) as HTMLInputElement

      // Manually set checked since h() uses setAttribute
      if (enabled) checkbox.checked = true

      const cmdInput = h('input', {
        type: 'text',
        className: 'app-frame-url',
        value: command,
        dataset: { checkCmd: name },
        style: { width: '100%' },
        placeholder: 'command to run',
      }) as HTMLInputElement

      // Manually set value since h() uses setAttribute
      cmdInput.value = command

      const card = h('div', {
        className: 'card',
        style: { marginBottom: '12px', padding: '16px' },
      },
        h('div', {
          style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
        },
          checkbox,
          h('label', {
            for: checkId,
            style: { fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
          }, label),
        ),
        cmdInput,
      )

      checksContainer.appendChild(card)
    }

    actionsDiv.style.display = 'block'
  }

  effect(() => {
    if (loaded()) {
      renderChecks()
    }
  })

  // Show no-data initially
  checksContainer.appendChild(
    h('div', { className: 'no-data' },
      h('h2', null, 'No configuration found'),
      h('p', null, 'Run '),
      h('code', null, 'dev-inspect init'),
      h('p', null, ' to scan your project and create a config file,'),
      h('p', { style: { marginTop: '8px' } }, 'or configure checks below:'),
    ),
  )

  const element = h('div', { id: 'tab-settings', className: 'tab-content' },
    h('div', { style: { maxWidth: '640px' } },
      h('div', { className: 'section-title' }, 'Check Configuration'),
      h('p', {
        style: { fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' },
      }),
      checksContainer,
      actionsDiv,
    ),
  )

  // Set the description paragraph with inline code
  const descP = element.querySelector('div > p') as HTMLElement
  if (descP) {
    descP.innerHTML = 'Toggle checks on/off and customize commands. Changes are saved to <code style="background:var(--surface);padding:2px 6px;border-radius:3px;">.dev-inspect.json</code> in the target project.'
  }

  function activate() {
    if (!settingsLoaded()) {
      settingsLoaded.set(true)
      load()
    }
  }

  return { element, activate }
}
