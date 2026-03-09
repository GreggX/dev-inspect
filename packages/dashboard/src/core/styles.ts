let counter = 0

export function css(template: TemplateStringsArray, ...values: any[]): string {
  const id = `scope-${++counter}`
  let raw = template.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')

  // Prefix top-level selectors with the scope class
  // Match selectors: lines starting with . # tag or @ and ending with {
  raw = raw.replace(
    /([^\s{}@][^{}]*?)\s*\{/g,
    (match, selector: string) => {
      // Don't prefix @keyframes or @media contents
      if (selector.trim().startsWith('@')) return match
      // Prefix each comma-separated selector
      const prefixed = selector
        .split(',')
        .map((s: string) => `.${id} ${s.trim()}`)
        .join(', ')
      return `${prefixed} {`
    },
  )

  injectStyles(id, raw)
  return id
}

export function injectStyles(id: string, cssText: string): void {
  if (document.getElementById(`style-${id}`)) return
  const style = document.createElement('style')
  style.id = `style-${id}`
  style.textContent = cssText
  document.head.appendChild(style)
}
