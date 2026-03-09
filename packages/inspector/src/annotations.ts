import { getSelector, getKeyStyles, getRect } from './utils.js'
import { getReactContext } from './react-fiber.js'
import type { ToolbarRefs } from './toolbar.js'
import type { PickerState } from './picker.js'

export interface Annotation {
  id: number
  selector: string
  rect: { x: number; y: number; width: number; height: number }
  component: string | null
  filePath: string | null
  lineNumber: number | null
  nearestUserComponent: { name: string; filePath: string | null; lineNumber: number | null } | null
  componentHierarchy: Array<{ name: string; filePath: string | null; lineNumber: number | null }>
  props: Record<string, any>
  tag: string
  classes: string[]
  styles: Record<string, string>
  comment: string
  timestamp: string
  pageUrl: string
}

let annotations: Annotation[] = []

export function getAnnotations(): Annotation[] {
  return annotations
}

export function clearAnnotations(): void {
  annotations = []
}

export function addAnnotation(
  state: PickerState,
  refs: ToolbarRefs,
  dashboardApi: string
): void {
  if (!state.selectedEl || !refs.commentInput.value.trim()) return

  const reactCtx = (state.selectedEl as any).__ddi_reactContext || getReactContext(state.selectedEl)

  const annotation: Annotation = {
    id: Date.now(),
    selector: getSelector(state.selectedEl),
    rect: getRect(state.selectedEl),
    component: reactCtx.componentName,
    filePath: reactCtx.filePath,
    lineNumber: reactCtx.lineNumber,
    nearestUserComponent: reactCtx.nearestUserComponent,
    componentHierarchy: reactCtx.componentHierarchy,
    props: reactCtx.props,
    tag: state.selectedEl.tagName.toLowerCase(),
    classes:
      state.selectedEl.className && typeof state.selectedEl.className === 'string'
        ? state.selectedEl.className.split(/\s+/).filter((c) => !c.startsWith('ddi-'))
        : [],
    styles: getKeyStyles(state.selectedEl),
    comment: refs.commentInput.value.trim(),
    timestamp: new Date().toISOString(),
    pageUrl: window.location.pathname,
  }

  annotations.push(annotation)
  refs.commentInput.value = ''
  renderAnnotations(refs, dashboardApi)
  saveAnnotations(dashboardApi)
}

export function removeAnnotation(
  id: number,
  refs: ToolbarRefs,
  dashboardApi: string
): void {
  annotations = annotations.filter((a) => a.id !== id)
  renderAnnotations(refs, dashboardApi)
  saveAnnotations(dashboardApi)
}

export function renderAnnotations(refs: ToolbarRefs, dashboardApi: string = ''): void {
  refs.countBadge.textContent = String(annotations.length)
  if (annotations.length === 0) {
    refs.annotationsContainer.style.display = 'none'
    return
  }
  refs.annotationsContainer.style.display = 'block'
  refs.annotationsList.innerHTML = annotations
    .map(
      (a) => `
      <div class="ddi-annotation-item">
        <div style="flex:1;min-width:0;">
          <div class="selector">${a.component ? a.component : a.tag}${a.filePath ? ' <span style="color:#34d399;font-size:9px;">' + a.filePath + (a.lineNumber ? ':' + a.lineNumber : '') + '</span>' : ''}</div>
          ${a.nearestUserComponent && a.nearestUserComponent.name !== a.component ? '<div style="font-size:9px;color:#fbbf24;">in ' + a.nearestUserComponent.name + (a.nearestUserComponent.filePath ? ' (' + a.nearestUserComponent.filePath + ')' : '') + '</div>' : ''}
          <div class="comment">${a.comment}</div>
        </div>
        <button class="ddi-annotation-remove" data-id="${a.id}">&times;</button>
      </div>
    `
    )
    .join('')

  refs.annotationsList.querySelectorAll('.ddi-annotation-remove').forEach((btn) => {
    btn.addEventListener('click', () =>
      removeAnnotation(parseInt((btn as HTMLElement).dataset.id!), refs, dashboardApi)
    )
  })
}

export async function saveAnnotations(dashboardApi: string): Promise<void> {
  try {
    await fetch(dashboardApi + '/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations, pageUrl: window.location.href }),
    })
  } catch (e: any) {
    console.warn('[Inspector] Could not save annotations:', e.message)
  }
}

export async function sendToClaude(
  refs: ToolbarRefs,
  dashboardApi: string
): Promise<void> {
  if (annotations.length === 0) {
    alert('Add at least one annotation before sending to Claude.')
    return
  }

  refs.sendClaudeBtn.textContent = 'Sending...'
  refs.sendClaudeBtn.disabled = true

  try {
    const res = await fetch(dashboardApi + '/api/send-to-claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annotations,
        pageUrl: window.location.href,
        pageTitle: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }),
    })
    const result = await res.json()
    if (result.success) {
      refs.sendClaudeBtn.textContent = 'Sent!'
      setTimeout(() => {
        refs.sendClaudeBtn.textContent = 'Send to Claude'
        refs.sendClaudeBtn.disabled = false
      }, 2000)
    }
  } catch (e: any) {
    console.error('[Inspector] Send to Claude failed:', e)
    refs.sendClaudeBtn.textContent = 'Failed'
    setTimeout(() => {
      refs.sendClaudeBtn.textContent = 'Send to Claude'
      refs.sendClaudeBtn.disabled = false
    }, 2000)
  }
}
