export interface ReactContextResult {
  componentName: string | null
  filePath: string | null
  lineNumber: number | null
  componentHierarchy: Array<{ name: string; filePath: string | null; lineNumber: number | null }>
  nearestUserComponent: { name: string; filePath: string | null; lineNumber: number | null } | null
  props: Record<string, any>
}

export function getReactContext(el: Element): ReactContextResult {
  const result: ReactContextResult = {
    componentName: null,
    filePath: null,
    lineNumber: null,
    componentHierarchy: [],
    nearestUserComponent: null,
    props: {},
  }

  const fiberKey = Object.keys(el).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  )
  if (!fiberKey) return result

  let fiber = (el as any)[fiberKey]
  let foundFirst = false

  // Walk up the fiber tree collecting component info
  while (fiber && result.componentHierarchy.length < 15) {
    const name = getFiberComponentName(fiber)
    if (name) {
      const source = getFiberSource(fiber)
      const entry = {
        name,
        filePath: source?.fileName ?? null,
        lineNumber: source?.lineNumber ?? null,
      }

      result.componentHierarchy.push(entry)

      // First component is the closest one
      if (!foundFirst) {
        foundFirst = true
        result.componentName = name
        result.filePath = entry.filePath
        result.lineNumber = entry.lineNumber

        // Extract interesting props (skip internal/complex ones)
        try {
          const props = fiber.memoizedProps || fiber.pendingProps
          if (props && typeof props === 'object') {
            for (const [key, val] of Object.entries(props)) {
              if (key === 'children' || key === 'ref' || key === 'key') continue
              if (typeof val === 'function') {
                result.props[key] = '[function]'
              } else if (
                typeof val === 'string' ||
                typeof val === 'number' ||
                typeof val === 'boolean'
              ) {
                result.props[key] = val
              } else if (val === null || val === undefined) {
                result.props[key] = val
              }
            }
          }
        } catch {}
      }

      // Track nearest "user" component (not from node_modules/react/next)
      if (!result.nearestUserComponent && entry.filePath) {
        const fp = entry.filePath
        if (!fp.includes('node_modules') && !fp.includes('react-dom') && !fp.includes('next/')) {
          result.nearestUserComponent = entry
        }
      }
    }
    fiber = fiber.return
  }

  return result
}

export function getReactComponentName(el: Element): string | null {
  const ctx = getReactContext(el)
  return ctx.componentName
}

function getFiberComponentName(fiber: any): string | null {
  if (!fiber.type) return null
  if (typeof fiber.type === 'string') return null // native HTML elements
  if (typeof fiber.type === 'function') {
    return fiber.type.displayName || fiber.type.name || null
  }
  if (typeof fiber.type === 'object') {
    // forwardRef, memo, etc.
    if (fiber.type.render) return fiber.type.render.displayName || fiber.type.render.name || null
    if (fiber.type.displayName) return fiber.type.displayName
    if (fiber.type.$$typeof) {
      // React.memo wraps a type
      const inner = fiber.type.type || fiber.type
      if (inner && typeof inner === 'function') return inner.displayName || inner.name || null
    }
  }
  return null
}

function getFiberSource(fiber: any): { fileName: string; lineNumber: number } | null {
  // React dev mode attaches _debugSource with fileName and lineNumber
  if (fiber._debugSource) {
    return {
      fileName: normalizeFilePath(fiber._debugSource.fileName),
      lineNumber: fiber._debugSource.lineNumber,
    }
  }
  // Also check _debugOwner for source info
  if (fiber._debugOwner && fiber._debugOwner._debugSource) {
    return {
      fileName: normalizeFilePath(fiber._debugOwner._debugSource.fileName),
      lineNumber: fiber._debugOwner._debugSource.lineNumber,
    }
  }
  // React 19+ uses __debugInfo or different structure
  if (fiber.type && fiber.type.__source) {
    return {
      fileName: normalizeFilePath(fiber.type.__source.fileName),
      lineNumber: fiber.type.__source.lineNumber,
    }
  }
  return null
}

function normalizeFilePath(fp: string): string {
  if (!fp) return fp
  // Remove webpack/turbopack prefixes
  return fp
    .replace(/^webpack-internal:\/\/\//, '')
    .replace(/^\([^)]+\)\//, '')
    .replace(/^\.\//, '')
    .replace(/\?.*$/, '')
}
