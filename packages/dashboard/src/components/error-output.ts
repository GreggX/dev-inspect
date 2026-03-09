import { h } from '../core/dom.js'

export function ErrorOutput(error: string): HTMLElement {
  return h('div', { className: 'error-output' }, error)
}
