'use client'

import { RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

// Cada modal abierta ocupa una entrada en el historial: el gesto de "atrás" cierra la de
// arriba en vez de salir de la página. Las entradas se sincronizan en lote para que cerrar
// una modal y abrir otra en el mismo ciclo reutilice la entrada en vez de ir y volver.

const STATE_KEY = '__modalDepth'

interface Entry {
  id: string
  close: () => void
}

const stack: Entry[] = []
let depth = 0
let traversing = false
let syncScheduled = false
let listening = false

function stateDepth(state: unknown): number {
  const d = (state as Record<string, unknown> | null)?.[STATE_KEY]
  return typeof d === 'number' ? d : 0
}

function sync() {
  syncScheduled = false
  if (traversing) return
  // Si otra navegación reemplazó la entrada (cambio de ruta), no hay nada que deshacer.
  depth = stateDepth(window.history.state)
  const diff = stack.length - depth
  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      depth += 1
      window.history.pushState({ ...window.history.state, [STATE_KEY]: depth }, '')
    }
  } else if (diff < 0) {
    traversing = true
    window.history.go(diff)
  }
}

function scheduleSync() {
  if (syncScheduled) return
  syncScheduled = true
  setTimeout(sync, 0)
}

function onPopState(event: PopStateEvent) {
  const next = stateDepth(event.state)
  if (traversing) {
    traversing = false
    depth = next
    scheduleSync()
    return
  }
  while (depth > next && stack.length > 0) {
    depth -= 1
    stack.pop()?.close()
  }
  depth = next
  scheduleSync()
}

function ensureListener() {
  if (listening) return
  listening = true
  window.addEventListener('popstate', onPopState)
}

export function useBackToClose(open: boolean, close: () => void) {
  const id = useId()
  const closeRef = useRef(close)
  const openRef = useRef(open)
  useLayoutEffect(() => {
    closeRef.current = close
    openRef.current = open
  })

  useEffect(() => {
    if (!open) return
    ensureListener()
    const entry: Entry = {
      id,
      close: () => {
        closeRef.current()
        // Si la modal rechazó el cierre, recupera su entrada para el próximo "atrás".
        setTimeout(() => {
          if (openRef.current && !stack.some((e) => e.id === id)) {
            stack.push(entry)
            scheduleSync()
          }
        }, 0)
      },
    }
    stack.push(entry)
    scheduleSync()
    return () => {
      const i = stack.findIndex((e) => e.id === id)
      if (i === -1) return
      stack.splice(i, 1)
      scheduleSync()
    }
  }, [open, id])
}

interface DismissibleRootProps<D, A extends { close: () => void }> {
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean, details: D) => void) | undefined
  actionsRef?: RefObject<A | null> | undefined
}

// Props para la raíz de una modal (controlada o no) que la cierran con el gesto de "atrás".
export function useBackDismissProps<D, A extends { close: () => void }>(
  props: DismissibleRootProps<D, A>
) {
  const { open, defaultOpen, onOpenChange, actionsRef } = props
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false)
  const ownRef = useRef<A | null>(null)
  const ref = actionsRef ?? ownRef
  useBackToClose(open ?? innerOpen, () => ref.current?.close())
  return {
    actionsRef: ref,
    onOpenChange: (o: boolean, details: D) => {
      setInnerOpen(o)
      onOpenChange?.(o, details)
    },
  }
}
