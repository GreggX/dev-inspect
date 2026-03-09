export function getSelector(el: Element): string {
  if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.body && parts.length < 4) {
    let selector = current.tagName.toLowerCase()
    if ((current as HTMLElement).id) {
      selector = `#${(current as HTMLElement).id}`
      parts.unshift(selector)
      break
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith('ddi-'))
        .slice(0, 2)
      if (classes.length) selector += '.' + classes.join('.')
    }
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }
    parts.unshift(selector)
    current = current.parentElement
  }
  return parts.join(' > ')
}

export function getKeyStyles(el: Element): Record<string, string> {
  const computed = getComputedStyle(el)
  const props = [
    'display',
    'position',
    'width',
    'height',
    'margin',
    'padding',
    'gap',
    'font-size',
    'font-weight',
    'color',
    'background-color',
    'border',
    'border-radius',
    'flex-direction',
    'justify-content',
    'align-items',
    'grid-template-columns',
    'grid-template-rows',
    'overflow',
    'z-index',
    'opacity',
  ]
  const styles: Record<string, string> = {}
  for (const prop of props) {
    const val = computed.getPropertyValue(prop)
    if (
      val &&
      val !== 'none' &&
      val !== 'normal' &&
      val !== 'auto' &&
      val !== '0px' &&
      val !== 'rgba(0, 0, 0, 0)' &&
      val !== 'visible' &&
      val !== 'static' &&
      val !== '1'
    ) {
      styles[prop] = val
    }
  }
  return styles
}

export function getRect(el: Element): { x: number; y: number; width: number; height: number } {
  const r = el.getBoundingClientRect()
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.width),
    height: Math.round(r.height),
  }
}

export async function captureElement(el: Element): Promise<string | null> {
  const rect = el.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // Use html-to-image approach via SVG foreignObject
  const serializer = new XMLSerializer()
  const clone = el.cloneNode(true) as Element
  // Remove inspector classes
  clone.querySelectorAll('[class*="ddi-"]').forEach((n) => n.remove())
  ;(clone as HTMLElement).classList.remove('ddi-selected', 'ddi-highlight')

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', String(rect.width))
  svg.setAttribute('height', String(rect.height))
  const fo = document.createElementNS(svgNS, 'foreignObject')
  fo.setAttribute('width', '100%')
  fo.setAttribute('height', '100%')
  fo.appendChild(clone)
  svg.appendChild(fo)

  const svgStr = serializer.serializeToString(svg)
  const img = new Image()
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
      URL.revokeObjectURL(url)
      try {
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function flashScreen(): void {
  const flash = document.createElement('div')
  flash.className = 'ddi-screenshot-flash'
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 300)
}
