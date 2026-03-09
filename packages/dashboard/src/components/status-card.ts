import { h } from '../core/dom.js'

export interface StatusCardProps {
  title: string
  status: string
  value: string
  detail: string
  error?: string
  valueStyle?: Partial<CSSStyleDeclaration>
}

export function StatusCard(props: StatusCardProps): HTMLElement {
  const children: (HTMLElement | string)[] = [
    h('div', { className: 'card-header' },
      h('span', { className: 'card-title' }, props.title),
      h('span', { className: `status-badge status-${props.status}` }, props.status),
    ),
    h('div', {
      className: 'card-value',
      ...(props.valueStyle ? { style: props.valueStyle } : {}),
    }, props.value),
    h('div', { className: 'card-detail' }, props.detail),
  ]

  if (props.error) {
    children.push(h('div', { className: 'error-output' }, props.error))
  }

  return h('div', { className: 'card' }, ...children)
}
