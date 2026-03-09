export interface ToolbarRefs {
  toolbar: HTMLDivElement
  pickBtn: HTMLButtonElement
  infoPanel: HTMLDivElement
  commentInput: HTMLTextAreaElement
  annotationActions: HTMLDivElement
  addAnnotationBtn: HTMLButtonElement
  sendClaudeBtn: HTMLButtonElement
  annotationsContainer: HTMLDivElement
  annotationsList: HTMLDivElement
  countBadge: HTMLSpanElement
  screenshotFullBtn: HTMLButtonElement
  screenshotElBtn: HTMLButtonElement
  minimizeBtn: HTMLButtonElement
  closeBtn: HTMLButtonElement
  clearAllBtn: HTMLButtonElement
}

export function createToolbar(): ToolbarRefs {
  const toolbar = document.createElement('div') as HTMLDivElement
  toolbar.className = 'ddi-toolbar'
  toolbar.innerHTML = `
    <div class="ddi-toolbar-header">
      <span class="ddi-toolbar-title">UI Inspector</span>
      <div style="display:flex;gap:4px;">
        <button class="ddi-btn" id="ddi-minimize">_</button>
        <button class="ddi-btn" id="ddi-close">&times;</button>
      </div>
    </div>
    <div class="ddi-toolbar-body">
      <div class="ddi-actions">
        <button class="ddi-btn" id="ddi-pick">Pick Element</button>
        <button class="ddi-btn" id="ddi-screenshot-full">Full Screenshot</button>
        <button class="ddi-btn" id="ddi-screenshot-el">Element Screenshot</button>
      </div>
      <div id="ddi-info" class="ddi-element-info" style="display:none;"></div>
      <textarea id="ddi-comment" class="ddi-annotation-input" placeholder="Describe the styling change... (e.g., 'Add more padding on top', 'Make this text bolder')" style="display:none;"></textarea>
      <div id="ddi-annotation-actions" style="display:none;gap:6px;">
        <button class="ddi-btn" id="ddi-add-annotation">Add Annotation</button>
        <button class="ddi-btn ddi-btn-send" id="ddi-send-claude">Send to Claude</button>
      </div>
      <div id="ddi-annotations-container" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;margin-bottom:6px;">
          <span style="font-size:11px;color:#8888a0;">Annotations<span class="ddi-badge" id="ddi-count">0</span></span>
          <button class="ddi-btn" id="ddi-clear-all" style="font-size:10px;padding:2px 6px;">Clear All</button>
        </div>
        <div class="ddi-annotations-list" id="ddi-list"></div>
      </div>
    </div>
  `
  document.body.appendChild(toolbar)

  // Make toolbar draggable
  let isDragging = false
  let dragOffsetX = 0
  let dragOffsetY = 0
  const header = toolbar.querySelector('.ddi-toolbar-header') as HTMLElement
  header.style.cursor = 'grab'
  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    isDragging = true
    dragOffsetX = e.clientX - toolbar.offsetLeft
    dragOffsetY = e.clientY - toolbar.offsetTop
    header.style.cursor = 'grabbing'
  })
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return
    toolbar.style.left = e.clientX - dragOffsetX + 'px'
    toolbar.style.top = e.clientY - dragOffsetY + 'px'
    toolbar.style.right = 'auto'
    toolbar.style.bottom = 'auto'
  })
  document.addEventListener('mouseup', () => {
    isDragging = false
    header.style.cursor = 'grab'
  })

  const refs: ToolbarRefs = {
    toolbar,
    pickBtn: document.getElementById('ddi-pick') as HTMLButtonElement,
    infoPanel: document.getElementById('ddi-info') as HTMLDivElement,
    commentInput: document.getElementById('ddi-comment') as HTMLTextAreaElement,
    annotationActions: document.getElementById('ddi-annotation-actions') as HTMLDivElement,
    addAnnotationBtn: document.getElementById('ddi-add-annotation') as HTMLButtonElement,
    sendClaudeBtn: document.getElementById('ddi-send-claude') as HTMLButtonElement,
    annotationsContainer: document.getElementById('ddi-annotations-container') as HTMLDivElement,
    annotationsList: document.getElementById('ddi-list') as HTMLDivElement,
    countBadge: document.getElementById('ddi-count') as HTMLSpanElement,
    screenshotFullBtn: document.getElementById('ddi-screenshot-full') as HTMLButtonElement,
    screenshotElBtn: document.getElementById('ddi-screenshot-el') as HTMLButtonElement,
    minimizeBtn: document.getElementById('ddi-minimize') as HTMLButtonElement,
    closeBtn: document.getElementById('ddi-close') as HTMLButtonElement,
    clearAllBtn: document.getElementById('ddi-clear-all') as HTMLButtonElement,
  }

  return refs
}
