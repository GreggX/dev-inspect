// Reactive signal system — minimal implementation

type Subscriber = () => void

let currentEffect: Subscriber | null = null
let batchDepth = 0
const pendingEffects = new Set<Subscriber>()

export interface Signal<T> {
  (): T
  set(value: T): void
  update(fn: (prev: T) => T): void
  subscribe(fn: () => void): () => void
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial
  const subscribers = new Set<Subscriber>()

  const read = (() => {
    if (currentEffect) {
      subscribers.add(currentEffect)
    }
    return value
  }) as Signal<T>

  read.set = (newValue: T) => {
    if (Object.is(value, newValue)) return
    value = newValue
    for (const sub of subscribers) {
      if (batchDepth > 0) {
        pendingEffects.add(sub)
      } else {
        sub()
      }
    }
  }

  read.update = (fn: (prev: T) => T) => {
    read.set(fn(value))
  }

  read.subscribe = (fn: () => void): (() => void) => {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }

  return read
}

export function batch(fn: () => void): void {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      const effects = [...pendingEffects]
      pendingEffects.clear()
      for (const eff of effects) {
        eff()
      }
    }
  }
}

export function effect(fn: () => void): () => void {
  const execute = () => {
    const prev = currentEffect
    currentEffect = execute
    try {
      fn()
    } finally {
      currentEffect = prev
    }
  }
  execute()
  return () => {
    pendingEffects.delete(execute)
  }
}

export function computed<T>(fn: () => T): Signal<T> {
  const s = signal<T>(undefined as T)
  effect(() => {
    s.set(fn())
  })
  return s
}
