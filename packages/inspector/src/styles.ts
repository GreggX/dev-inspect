export const STYLES = `
    .ddi-highlight {
      outline: 2px solid #818cf8 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    .ddi-selected {
      outline: 3px solid #f59e0b !important;
      outline-offset: 2px !important;
    }
    .ddi-toolbar {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 999999;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      background: #12121a;
      color: #e4e4ef;
      border: 1px solid #2a2a3a;
      border-radius: 10px;
      padding: 12px;
      min-width: 320px;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      user-select: none;
    }
    .ddi-toolbar * { box-sizing: border-box; }
    .ddi-toolbar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #2a2a3a;
    }
    .ddi-toolbar-title {
      font-weight: 600;
      font-size: 13px;
      color: #818cf8;
    }
    .ddi-btn {
      padding: 5px 10px;
      border-radius: 5px;
      border: 1px solid #2a2a3a;
      background: #1a1a25;
      color: #e4e4ef;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      transition: all 0.15s;
    }
    .ddi-btn:hover { background: #2a2a3a; border-color: #818cf8; }
    .ddi-btn-active { background: #4f46e5; border-color: #818cf8; color: white; }
    .ddi-btn-send { background: #059669; border-color: #34d399; }
    .ddi-btn-send:hover { background: #047857; }
    .ddi-actions { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .ddi-element-info {
      background: #0a0a0f;
      border: 1px solid #2a2a3a;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 10px;
      font-size: 11px;
      max-height: 120px;
      overflow-y: auto;
    }
    .ddi-element-info .tag { color: #f87171; }
    .ddi-element-info .cls { color: #818cf8; }
    .ddi-element-info .id { color: #fbbf24; }
    .ddi-element-info .prop { color: #8888a0; }
    .ddi-element-info .val { color: #34d399; }
    .ddi-annotation-input {
      width: 100%;
      padding: 8px;
      border-radius: 5px;
      border: 1px solid #2a2a3a;
      background: #0a0a0f;
      color: #e4e4ef;
      font-family: inherit;
      font-size: 12px;
      resize: vertical;
      min-height: 60px;
      margin-bottom: 8px;
    }
    .ddi-annotation-input::placeholder { color: #6b7280; }
    .ddi-annotation-input:focus { outline: none; border-color: #818cf8; }
    .ddi-annotations-list {
      max-height: 150px;
      overflow-y: auto;
      margin-top: 10px;
    }
    .ddi-annotation-item {
      background: #0a0a0f;
      border: 1px solid #2a2a3a;
      border-radius: 5px;
      padding: 6px 8px;
      margin-bottom: 4px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .ddi-annotation-item .selector { color: #818cf8; font-size: 10px; }
    .ddi-annotation-item .comment { color: #e4e4ef; margin-top: 2px; }
    .ddi-annotation-remove {
      background: none;
      border: none;
      color: #f87171;
      cursor: pointer;
      font-size: 14px;
      padding: 0 4px;
      flex-shrink: 0;
    }
    .ddi-badge {
      display: inline-block;
      background: #4f46e5;
      color: white;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 6px;
    }
    .ddi-screenshot-flash {
      position: fixed;
      inset: 0;
      background: white;
      opacity: 0;
      z-index: 999998;
      pointer-events: none;
      animation: ddi-flash 0.3s ease-out;
    }
    @keyframes ddi-flash {
      0% { opacity: 0.6; }
      100% { opacity: 0; }
    }
    .ddi-minimized {
      min-width: auto !important;
      max-width: auto !important;
    }
    .ddi-minimized .ddi-toolbar-body { display: none; }
`

let styleElement: HTMLStyleElement | null = null

export function injectStyles(): void {
  styleElement = document.createElement('style')
  styleElement.textContent = STYLES
  document.head.appendChild(styleElement)
}

export function removeStyles(): void {
  if (styleElement) {
    styleElement.remove()
    styleElement = null
  }
}
