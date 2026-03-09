import { injectStyles, removeStyles } from './styles.js'
import { createToolbar } from './toolbar.js'
import { createPickerState, startPicker, stopPicker, selectElement } from './picker.js'
import {
  addAnnotation,
  clearAnnotations,
  renderAnnotations,
  saveAnnotations,
  sendToClaude,
} from './annotations.js'
import { getSelector, getRect, flashScreen } from './utils.js'

;(function () {
  if ((window as any).__devDashInspector) return
  ;(window as any).__devDashInspector = true

  const DASHBOARD_API: string =
    (window as any).__DASHBOARD_ORIGIN || 'http://localhost:4444'

  // --- Inject styles ---
  injectStyles()

  // --- Build toolbar UI ---
  const refs = createToolbar()
  const { toolbar } = refs

  // --- Picker state ---
  const pickerState = createPickerState()

  // --- Picker event listeners ---
  document.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      if (!pickerState.isPickerActive) return
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      if (!el || toolbar.contains(el)) return
      if (pickerState.hoveredEl && pickerState.hoveredEl !== el) {
        pickerState.hoveredEl.classList.remove('ddi-highlight')
      }
      pickerState.hoveredEl = el
      pickerState.hoveredEl.classList.add('ddi-highlight')
    },
    true
  )

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (!pickerState.isPickerActive) return
      if (toolbar.contains(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      stopPicker(pickerState, refs)
      selectElement(e.target as HTMLElement, pickerState, refs, DASHBOARD_API).catch(
        console.error
      )
    },
    true
  )

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (pickerState.isPickerActive) stopPicker(pickerState, refs)
      if (pickerState.selectedEl) {
        pickerState.selectedEl.classList.remove('ddi-selected')
        pickerState.selectedEl = null
        refs.infoPanel.style.display = 'none'
        refs.commentInput.style.display = 'none'
        refs.annotationActions.style.display = 'none'
      }
    }
  })

  // --- Button event listeners ---
  refs.pickBtn.addEventListener('click', () => {
    if (pickerState.isPickerActive) stopPicker(pickerState, refs)
    else startPicker(pickerState, refs)
  })

  refs.addAnnotationBtn.addEventListener('click', () => {
    addAnnotation(pickerState, refs, DASHBOARD_API)
  })

  refs.commentInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addAnnotation(pickerState, refs, DASHBOARD_API)
    }
  })

  refs.sendClaudeBtn.addEventListener('click', () => {
    sendToClaude(refs, DASHBOARD_API)
  })

  refs.screenshotFullBtn.addEventListener('click', async () => {
    flashScreen()
    try {
      const res = await fetch(DASHBOARD_API + '/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full', pageUrl: window.location.href }),
      })
      const result = await res.json()
      if (result.success) {
        refs.screenshotFullBtn.textContent = 'Captured!'
        setTimeout(() => {
          refs.screenshotFullBtn.textContent = 'Full Screenshot'
        }, 1500)
      }
    } catch (e: any) {
      console.error('[Inspector] Screenshot failed:', e)
    }
  })

  refs.screenshotElBtn.addEventListener('click', async () => {
    if (!pickerState.selectedEl) {
      alert('Select an element first using the picker.')
      return
    }
    flashScreen()
    const rect = getRect(pickerState.selectedEl)
    try {
      const res = await fetch(DASHBOARD_API + '/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'element',
          pageUrl: window.location.href,
          selector: getSelector(pickerState.selectedEl),
          rect,
        }),
      })
      const result = await res.json()
      if (result.success) {
        refs.screenshotElBtn.textContent = 'Captured!'
        setTimeout(() => {
          refs.screenshotElBtn.textContent = 'Element Screenshot'
        }, 1500)
      }
    } catch (e: any) {
      console.error('[Inspector] Element screenshot failed:', e)
    }
  })

  refs.clearAllBtn.addEventListener('click', () => {
    clearAnnotations()
    renderAnnotations(refs, DASHBOARD_API)
    saveAnnotations(DASHBOARD_API)
  })

  refs.minimizeBtn.addEventListener('click', () => {
    toolbar.classList.toggle('ddi-minimized')
    refs.minimizeBtn.textContent = toolbar.classList.contains('ddi-minimized') ? '+' : '_'
  })

  refs.closeBtn.addEventListener('click', () => {
    toolbar.remove()
    removeStyles()
    if (pickerState.selectedEl) pickerState.selectedEl.classList.remove('ddi-selected')
    if (pickerState.hoveredEl) pickerState.hoveredEl.classList.remove('ddi-highlight')
    document.body.style.cursor = ''
    ;(window as any).__devDashInspector = false
  })
})()
