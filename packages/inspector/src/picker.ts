import { getSelector, getKeyStyles, getRect } from './utils.js'
import { getReactContext } from './react-fiber.js'
import type { ToolbarRefs } from './toolbar.js'

export interface PickerState {
  isPickerActive: boolean
  hoveredEl: HTMLElement | null
  selectedEl: (HTMLElement & { __ddi_reactContext?: any }) | null
}

export function createPickerState(): PickerState {
  return {
    isPickerActive: false,
    hoveredEl: null,
    selectedEl: null,
  }
}

export function startPicker(state: PickerState, refs: ToolbarRefs): void {
  state.isPickerActive = true
  refs.pickBtn.classList.add('ddi-btn-active')
  refs.pickBtn.textContent = 'Picking...'
  document.body.style.cursor = 'crosshair'
}

export function stopPicker(state: PickerState, refs: ToolbarRefs): void {
  state.isPickerActive = false
  refs.pickBtn.classList.remove('ddi-btn-active')
  refs.pickBtn.textContent = 'Pick Element'
  document.body.style.cursor = ''
  if (state.hoveredEl) {
    state.hoveredEl.classList.remove('ddi-highlight')
    state.hoveredEl = null
  }
}

export async function selectElement(
  el: HTMLElement,
  state: PickerState,
  refs: ToolbarRefs,
  dashboardApi: string
): Promise<void> {
  if (state.selectedEl) state.selectedEl.classList.remove('ddi-selected')
  state.selectedEl = el as HTMLElement & { __ddi_reactContext?: any }
  state.selectedEl.classList.add('ddi-selected')

  const selector = getSelector(el)
  const rect = getRect(el)
  const styles = getKeyStyles(el)
  const reactCtx = getReactContext(el)

  // Resolve component file paths server-side
  const componentNames = reactCtx.componentHierarchy.map((c) => c.name)
  console.log('[Inspector] Resolving components:', componentNames)
  if (componentNames.length > 0) {
    try {
      const res = await fetch(dashboardApi + '/api/resolve-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentNames }),
      })
      const resolved = await res.json()
      // Merge resolved file paths into the hierarchy
      for (const entry of reactCtx.componentHierarchy) {
        const matches = resolved[entry.name]
        if (matches && matches.length > 0) {
          entry.filePath = matches[0].filePath
          entry.lineNumber = matches[0].lineNumber
        }
      }
      // Update top-level fields
      if (!reactCtx.filePath && reactCtx.componentHierarchy[0]?.filePath) {
        reactCtx.filePath = reactCtx.componentHierarchy[0].filePath
        reactCtx.lineNumber = reactCtx.componentHierarchy[0].lineNumber
      }
      // Find nearest user component with resolved file
      const userComp = reactCtx.componentHierarchy.find(
        (c) => c.filePath && !c.filePath.includes('node_modules')
      )
      if (userComp) {
        reactCtx.nearestUserComponent = userComp
      }
    } catch (e: any) {
      console.warn('[Inspector] Component resolution failed:', e.message)
    }
  }

  // Store context on the element for annotation creation
  (el as any).__ddi_reactContext = reactCtx

  let html = ''

  // Component name + file path
  if (reactCtx.componentName) {
    html += `<div><span class="prop">Component:</span> <span class="val">${reactCtx.componentName}</span></div>`
    if (reactCtx.filePath) {
      html += `<div><span class="prop">File:</span> <span class="val" style="color:#34d399;font-size:10px;">${reactCtx.filePath}${reactCtx.lineNumber ? ':' + reactCtx.lineNumber : ''}</span></div>`
    }
  }

  // Nearest user component (if different from the direct one)
  if (
    reactCtx.nearestUserComponent &&
    reactCtx.nearestUserComponent.name !== reactCtx.componentName
  ) {
    html += `<div><span class="prop">Owner:</span> <span class="val">${reactCtx.nearestUserComponent.name}</span>`
    if (reactCtx.nearestUserComponent.filePath) {
      html += ` <span style="color:#34d399;font-size:10px;">${reactCtx.nearestUserComponent.filePath}${reactCtx.nearestUserComponent.lineNumber ? ':' + reactCtx.nearestUserComponent.lineNumber : ''}</span>`
    }
    html += `</div>`
  }

  // Element tag + classes
  html += `<div><span class="tag">&lt;${el.tagName.toLowerCase()}&gt;</span>`
  if (el.id) html += ` <span class="id">#${el.id}</span>`
  if (el.className && typeof el.className === 'string') {
    const classes = el.className
      .split(/\s+/)
      .filter((c) => !c.startsWith('ddi-'))
      .slice(0, 5)
    if (classes.length) html += ` <span class="cls">.${classes.join('.')}</span>`
  }
  html += `</div>`

  // Size
  html += `<div><span class="prop">Size:</span> <span class="val">${rect.width}x${rect.height}</span> <span class="prop">at</span> <span class="val">(${rect.x}, ${rect.y})</span></div>`

  // Props (if any interesting ones)
  const propEntries = Object.entries(reactCtx.props)
  if (propEntries.length > 0) {
    html += `<div style="margin-top:4px;"><span class="prop" style="color:#fbbf24;">Props:</span>`
    for (const [key, val] of propEntries.slice(0, 8)) {
      html += `<div style="padding-left:8px;"><span class="prop">${key}:</span> <span class="val">${val}</span></div>`
    }
    html += `</div>`
  }

  // Component hierarchy (collapsible)
  if (reactCtx.componentHierarchy.length > 1) {
    html += `<div style="margin-top:4px;border-top:1px solid #2a2a3a;padding-top:4px;">`
    html += `<span class="prop" style="cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">Component Tree ▸</span>`
    html += `<div style="display:none;padding-left:4px;margin-top:2px;">`
    for (let i = 0; i < reactCtx.componentHierarchy.length; i++) {
      const c = reactCtx.componentHierarchy[i]
      const indent = i * 8
      const isUser = c.filePath && !c.filePath.includes('node_modules')
      html += `<div style="padding-left:${indent}px;opacity:${isUser ? 1 : 0.5};">`
      html += `<span class="val">${i === 0 ? '▸ ' : '  '}${c.name}</span>`
      if (c.filePath) {
        html += ` <span style="color:#34d399;font-size:9px;">${c.filePath}${c.lineNumber ? ':' + c.lineNumber : ''}</span>`
      }
      html += `</div>`
    }
    html += `</div></div>`
  }

  // Key computed styles
  html += `<div style="margin-top:4px;">`
  for (const [prop, val] of Object.entries(styles)) {
    html += `<div><span class="prop">${prop}:</span> <span class="val">${val}</span></div>`
  }
  html += `</div>`

  refs.infoPanel.innerHTML = html
  refs.infoPanel.style.display = 'block'
  refs.commentInput.style.display = 'block'
  refs.annotationActions.style.display = 'flex'
  refs.commentInput.focus()
}
