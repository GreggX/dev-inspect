import { effect, type Signal } from './state.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'svg', 'circle', 'rect', 'line', 'path', 'g', 'text', 'defs',
  'clipPath', 'use', 'polygon', 'polyline', 'ellipse',
])

const cleanupMap = new WeakMap<HTMLElement, (() => void)[]>()

export function h(
  tag: string,
  props?: Record<string, any> | null,
  ...children: (Node | string | Signal<string> | (() => Node) | null | undefined | false | '')[]
): HTMLElement {
  const isSvg = SVG_TAGS.has(tag)
  const el = isSvg
    ? (document.createElementNS(SVG_NS, tag) as unknown as HTMLElement)
    : document.createElement(tag)

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value as EventListener)
      } else if (key === 'className') {
        el.setAttribute('class', value)
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign((el as HTMLElement).style, value)
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign((el as HTMLElement).dataset, value)
      } else if (key === 'innerHTML') {
        el.innerHTML = value
      } else if (typeof value === 'boolean') {
        if (value) {
          el.setAttribute(key, '')
        } else {
          el.removeAttribute(key)
        }
      } else if (isSvg) {
        el.setAttribute(key === 'className' ? 'class' : key, String(value))
      } else {
        el.setAttribute(key, String(value))
      }
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false || child === '') continue

    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child))
    } else if (child instanceof Node) {
      el.appendChild(child)
    } else if (typeof child === 'function' && 'set' in child) {
      // Signal<string>
      const sig = child as Signal<string>
      const textNode = document.createTextNode(sig())
      effect(() => {
        textNode.textContent = sig()
      })
      el.appendChild(textNode)
    } else if (typeof child === 'function') {
      // Reactive child — function that returns a Node
      const placeholder = document.createComment('reactive')
      el.appendChild(placeholder)
      let currentNode: Node = placeholder
      effect(() => {
        const newNode = (child as () => Node)()
        if (newNode !== currentNode) {
          if (currentNode !== placeholder && currentNode.parentNode) {
            currentNode.parentNode.replaceChild(newNode, currentNode)
          } else if (placeholder.parentNode) {
            placeholder.parentNode.insertBefore(newNode, placeholder.nextSibling)
          }
          currentNode = newNode
        }
      })
    }
  }

  return el
}

export function text(sig: Signal<string>): Text {
  const node = document.createTextNode(sig())
  effect(() => {
    node.textContent = sig()
  })
  return node
}

export function show(sig: Signal<boolean>, element: HTMLElement): HTMLElement {
  effect(() => {
    element.style.display = sig() ? '' : 'none'
  })
  return element
}

export function list<T>(
  items: Signal<T[]>,
  render: (item: T, index: number) => HTMLElement,
  key?: (item: T) => string | number,
): HTMLElement {
  const container = document.createElement('div')
  container.style.display = 'contents'

  effect(() => {
    const arr = items()
    // Simple approach: clear and re-render
    container.innerHTML = ''
    arr.forEach((item, index) => {
      container.appendChild(render(item, index))
    })
  })

  return container
}

export function mount(container: HTMLElement, component: HTMLElement): void {
  container.innerHTML = ''
  container.appendChild(component)
}

export function onCleanup(el: HTMLElement, fn: () => void): void {
  let fns = cleanupMap.get(el)
  if (!fns) {
    fns = []
    cleanupMap.set(el, fns)
  }
  fns.push(fn)
}

export function cleanup(el: HTMLElement): void {
  const fns = cleanupMap.get(el)
  if (fns) {
    for (const fn of fns) fn()
    cleanupMap.delete(el)
  }
}
