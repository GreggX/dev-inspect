import { h } from '../core/dom.js'
import { effect, signal } from '../core/state.js'
import { useAnnotations, type Annotation, type PromptLogEntry } from '../hooks/use-annotations.js'

export function UIHealthTab(): {
  element: HTMLElement
  activate: () => void
  deactivate: () => void
} {
  const { annotations, screenshots, promptLog, loadAnnotations, loadScreenshots, loadPromptLog, startPolling, stopPolling, sendToClaude } = useAnnotations()

  // Inspector snippet
  const inspectorSnippet = `(function(){var s=document.createElement('script');s.src='http://localhost:${location.port}/inspector.js';document.body.appendChild(s);var c=document.createElement('script');c.textContent="window.__DASHBOARD_ORIGIN='http://localhost:${location.port}'";document.body.appendChild(c)})()`

  // App URL input
  const appUrlInput = h('input', {
    type: 'text',
    className: 'app-frame-url',
    id: 'app-url',
    value: '/app',
  }) as HTMLInputElement

  // Iframe
  const appIframe = h('iframe', {
    id: 'app-iframe',
    src: 'about:blank',
  }) as HTMLIFrameElement

  // Fallback
  const snippetCode = h('code', {
    id: 'ddi-snippet',
    style: {
      display: 'block',
      background: 'var(--bg)',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '10px',
      color: 'var(--pass)',
      wordBreak: 'break-all',
      cursor: 'pointer',
    },
    title: 'Click to copy',
    onClick: () => {
      navigator.clipboard.writeText(inspectorSnippet).then(() => {
        snippetCode.style.color = 'var(--warn)'
        snippetCode.textContent = 'Copied!'
        setTimeout(() => {
          snippetCode.style.color = 'var(--pass)'
          snippetCode.textContent = inspectorSnippet
        }, 1500)
      })
    },
  }, inspectorSnippet)

  const bookmarklet = h('a', {
    id: 'ddi-bookmarklet',
    href: 'javascript:' + encodeURIComponent(inspectorSnippet),
    style: {
      display: 'inline-block',
      background: 'var(--accent-dim)',
      color: 'white',
      padding: '6px 14px',
      borderRadius: '5px',
      textDecoration: 'none',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'grab',
    },
  }, 'UI Inspector')

  const fallback = h('div', {
    id: 'app-frame-fallback',
    style: {
      display: 'none',
      position: 'absolute',
      inset: '0',
      background: 'var(--bg)',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '40px',
      textAlign: 'center',
    },
  },
    h('div', { style: { fontSize: '40px', opacity: '0.3' } }, '\u{1F50E}'),
    h('h3', { style: { fontSize: '14px', color: 'var(--text)' } }, 'Inspector Ready'),
    h('p', {
      style: {
        fontSize: '12px',
        color: 'var(--text-dim)',
        maxWidth: '360px',
        lineHeight: '1.6',
      },
    }, 'Your app uses authentication, so it can\'t be embedded in an iframe. Use one of these methods instead:'),
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '360px',
      },
    },
      // Option 1: Open with Proxy
      h('div', {
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '14px',
        },
      },
        h('div', {
          style: { fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '6px' },
        }, 'Option 1: Open with Proxy'),
        h('p', {
          style: { fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' },
        }, 'Opens your app through the dashboard proxy with the inspector auto-injected.'),
        h('button', {
          className: 'app-frame-btn',
          style: { width: '100%', padding: '8px' },
          onClick: () => window.open('/app', '_blank'),
        }, 'Open App with Inspector'),
      ),
      // Option 2: Bookmarklet
      h('div', {
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '14px',
        },
      },
        h('div', {
          style: { fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '6px' },
        }, 'Option 2: Bookmarklet'),
        h('p', {
          style: { fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' },
        }, 'Drag this to your bookmark bar, then click it on any page of your app:'),
        bookmarklet,
      ),
      // Option 3: Console Snippet
      h('div', {
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '14px',
        },
      },
        h('div', {
          style: { fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '6px' },
        }, 'Option 3: Console Snippet'),
        h('p', {
          style: { fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' },
        }, 'Paste this in your browser console on the app page:'),
        snippetCode,
      ),
    ),
  )

  // Iframe load detection
  appIframe.addEventListener('load', () => {
    try {
      const doc = appIframe.contentDocument
      if (!doc || !doc.body || doc.body.children.length === 0) {
        fallback.style.display = 'flex'
        appIframe.style.display = 'none'
      }
    } catch {
      fallback.style.display = 'flex'
      appIframe.style.display = 'none'
    }
  })

  // Toolbar buttons
  const reloadBtn = h('button', {
    className: 'app-frame-btn',
    onClick: () => {
      appIframe.src = appUrlInput.value
    },
  }, 'Reload')

  const openTabBtn = h('button', {
    className: 'app-frame-btn',
    onClick: () => window.open('/app', '_blank'),
  }, 'Open in Tab')

  appUrlInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      appIframe.src = (e.target as HTMLInputElement).value
    }
  })

  // Send to Claude button (must be created before the annotations effect that references it)
  const sendClaudeBtn = h('button', {
    className: 'send-claude-btn',
    disabled: true,
    onClick: async () => {
      sendClaudeBtn.textContent = 'Generating...'
      ;(sendClaudeBtn as HTMLButtonElement).disabled = true

      const result = await sendToClaude(appUrlInput.value, document.title || 'App')
      if (result.success) {
        sendClaudeBtn.textContent = 'Prompt Generated!'
        setTimeout(() => {
          sendClaudeBtn.textContent = 'Generate Prompt'
          ;(sendClaudeBtn as HTMLButtonElement).disabled = annotations().length === 0
        }, 2000)
      } else {
        sendClaudeBtn.textContent = 'Failed'
        setTimeout(() => {
          sendClaudeBtn.textContent = 'Generate Prompt'
          ;(sendClaudeBtn as HTMLButtonElement).disabled = annotations().length === 0
        }, 2000)
      }
    },
  }, 'Generate Prompt') as HTMLButtonElement

  // Annotations list
  const annotationCount = h('span', { className: 'badge-count' }, '0')
  const annotationsList = h('div', null)

  effect(() => {
    const items = annotations()
    annotationCount.textContent = String(items.length)
    sendClaudeBtn.disabled = items.length === 0

    if (items.length === 0) {
      annotationsList.innerHTML = ''
      annotationsList.appendChild(
        h('div', { className: 'empty-state' },
          'Use the inspector in the app frame to pick elements and add annotations.',
        ),
      )
      return
    }

    annotationsList.innerHTML = ''
    for (const a of items) {
      const itemEl = h('div', { className: 'annotation-item' })

      if (a.component) {
        itemEl.appendChild(h('div', { className: 'component' }, a.component))
      }
      if (a.filePath) {
        itemEl.appendChild(
          h('div', {
            style: { fontSize: '10px', color: 'var(--pass)', wordBreak: 'break-all' },
          }, a.filePath + (a.lineNumber ? ':' + a.lineNumber : '')),
        )
      }
      if (a.nearestUserComponent && a.nearestUserComponent.name !== a.component) {
        itemEl.appendChild(
          h('div', {
            style: { fontSize: '10px', color: 'var(--warn)' },
          }, `in ${a.nearestUserComponent.name}${a.nearestUserComponent.filePath ? ' (' + a.nearestUserComponent.filePath + ')' : ''}`),
        )
      }
      itemEl.appendChild(h('div', { className: 'selector' }, a.selector))
      itemEl.appendChild(h('div', { className: 'comment' }, a.comment))

      if (a.styles) {
        const preview = Object.entries(a.styles)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')
        itemEl.appendChild(h('div', { className: 'styles-preview' }, preview))
      }

      annotationsList.appendChild(itemEl)
    }
  })

  // Screenshots
  const screenshotsGrid = h('div', { className: 'screenshot-grid' })
  const noScreenshots = h('div', { className: 'empty-state' },
    'Use the inspector\'s screenshot buttons to capture UI elements.',
  )

  effect(() => {
    const files = screenshots()
    screenshotsGrid.innerHTML = ''

    if (files.length === 0) {
      noScreenshots.style.display = 'block'
      return
    }

    noScreenshots.style.display = 'none'
    for (const f of files.slice(0, 8)) {
      const thumb = h('div', {
        className: 'screenshot-thumb',
        onClick: () => window.open(f.url, '_blank'),
      },
        h('img', { src: f.url, alt: f.name }),
        h('div', { className: 'time' }, new Date(f.time).toLocaleTimeString()),
      )
      screenshotsGrid.appendChild(thumb)
    }
  })

  // Prompt Log
  const promptLogContainer = h('div', null)

  function renderPromptEntry(entry: PromptLogEntry, index: number): HTMLElement {
    const time = new Date(entry.timestamp)
    const timeStr = time.toLocaleTimeString()
    const dateStr = `${time.getMonth() + 1}/${time.getDate()}`

    const promptPreview = entry.prompt.length > 200
      ? entry.prompt.slice(0, 200) + '...'
      : entry.prompt

    const expandedContent = h('div', {
      style: {
        display: 'none',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '8px',
        fontSize: '10px',
        color: 'var(--text-dim)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: '300px',
        overflowY: 'auto',
        marginTop: '6px',
      },
    }, entry.prompt)

    const copyBtn = h('button', {
      className: 'app-frame-btn',
      style: { fontSize: '10px', padding: '2px 8px' },
      onClick: (e: Event) => {
        e.stopPropagation()
        navigator.clipboard.writeText(entry.prompt).then(() => {
          ;(copyBtn as HTMLElement).textContent = 'Copied!'
          setTimeout(() => { (copyBtn as HTMLElement).textContent = 'Copy' }, 1500)
        })
      },
    }, 'Copy') as HTMLElement

    const cliBtn = h('button', {
      className: 'app-frame-btn',
      style: { fontSize: '10px', padding: '2px 8px' },
      onClick: (e: Event) => {
        e.stopPropagation()
        navigator.clipboard.writeText('cat .dev-metrics/claude-prompt.md | claude').then(() => {
          ;(cliBtn as HTMLElement).textContent = 'Copied!'
          setTimeout(() => { (cliBtn as HTMLElement).textContent = 'CLI Cmd' }, 1500)
        })
      },
    }, 'CLI Cmd') as HTMLElement

    const card = h('div', {
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '8px',
        cursor: 'pointer',
      },
      onClick: () => {
        const isExpanded = expandedContent.style.display !== 'none'
        expandedContent.style.display = isExpanded ? 'none' : 'block'
      },
    },
      h('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
      },
        h('span', {
          style: { fontSize: '10px', color: 'var(--text-dim)' },
        }, `${dateStr} ${timeStr}`),
        h('div', { style: { display: 'flex', gap: '4px' } },
          copyBtn,
          cliBtn,
        ),
      ),
      h('div', {
        style: { fontSize: '11px', color: 'var(--accent)', marginBottom: '4px' },
      }, `${entry.annotationCount} annotation${entry.annotationCount !== 1 ? 's' : ''} — ${entry.pageTitle || entry.pageUrl}`),
      h('div', {
        style: { fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.4' },
      }, promptPreview),
      expandedContent,
    )

    return card
  }

  effect(() => {
    const log = promptLog()
    promptLogContainer.innerHTML = ''

    if (log.length === 0) {
      promptLogContainer.appendChild(
        h('div', { className: 'empty-state' },
          h('p', { style: { marginBottom: '8px' } }, 'No prompts generated yet.'),
          h('p', { style: { fontSize: '11px', color: 'var(--text-dim)' } },
            'Pick elements with the inspector, add annotations, then click "Generate Prompt" to create a Claude-ready prompt.',
          ),
        ),
      )
      return
    }

    // Show most recent first
    const reversed = [...log].reverse()
    for (let i = 0; i < reversed.length; i++) {
      promptLogContainer.appendChild(renderPromptEntry(reversed[i], i))
    }
  })

  const element = h('div', { id: 'tab-ui-health', className: 'tab-content' },
    h('div', { className: 'ui-health-layout' },
      // Left: App frame
      h('div', { className: 'app-frame-container' },
        h('div', { className: 'app-frame-toolbar' },
          h('span', { style: { color: 'var(--pass)' } }, '\u25CF'),
          appUrlInput,
          reloadBtn,
          openTabBtn,
        ),
        h('div', { className: 'app-frame' },
          appIframe,
          fallback,
        ),
      ),
      // Right: Sidebar
      h('div', { className: 'sidebar-panel' },
        // Annotations
        h('div', { className: 'sidebar-card' },
          h('div', { className: 'sidebar-card-title' },
            'Annotations ',
            annotationCount,
          ),
          annotationsList,
        ),
        // Screenshots
        h('div', { className: 'sidebar-card' },
          h('div', { className: 'sidebar-card-title' }, 'Screenshots'),
          screenshotsGrid,
          noScreenshots,
        ),
        // Generate Prompt + Log
        h('div', { className: 'sidebar-card' },
          h('div', { className: 'sidebar-card-title' }, 'Claude Prompts'),
          h('div', {
            style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' },
          },
            sendClaudeBtn,
          ),
          h('p', {
            style: { fontSize: '10px', color: 'var(--text-dim)', marginBottom: '10px' },
          }, 'Click a prompt to expand it. Use "Copy" to paste into Claude, or "CLI Cmd" to get the terminal command.'),
          promptLogContainer,
        ),
      ),
    ),
  )

  function activate() {
    // Load iframe on first activation
    if (appIframe.src === 'about:blank') {
      appIframe.src = '/app'

      // Timeout fallback detection
      setTimeout(() => {
        try {
          const doc = appIframe.contentDocument
          if (!doc || !doc.body || doc.body.innerHTML.length < 50) {
            fallback.style.display = 'flex'
            appIframe.style.display = 'none'
          }
        } catch {
          fallback.style.display = 'flex'
          appIframe.style.display = 'none'
        }
      }, 3000)
    }
    startPolling()
  }

  function deactivate() {
    stopPolling()
  }

  return { element, activate, deactivate }
}
