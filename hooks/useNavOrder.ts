'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { NAV_ITEMS } from '@/constants/site'

/* ─── Storage ─── */
const STORAGE_KEY = 'bolivar_nav_order_v1'

/** Orden por defecto: el de NAV_ITEMS, identificado por href (clave estable). */
const DEFAULT_ORDER: string[] = NAV_ITEMS.map((item) => item.href)

/**
 * Reconcilia un orden guardado contra los NAV_ITEMS actuales:
 * - descarta href's que ya no existen en el código
 * - anexa al final los tabs nuevos que aún no estaban guardados
 */
function reconcileOrder(saved: string[]): string[] {
  const valid = saved.filter((href) => DEFAULT_ORDER.includes(href))
  const missing = DEFAULT_ORDER.filter((href) => !valid.includes(href))
  return [...valid, ...missing]
}

/* ─── Hook ─── */
export function useNavOrder() {
  const [isMounted, setIsMounted] = useState(false)
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)

  // Hidratar desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((h) => typeof h === 'string')) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setOrder(reconcileOrder(parsed as string[]))
        }
      }
    } catch {
      /* ignore parse errors */
    }
    setIsMounted(true)
  }, [])

  // Persistir en cada cambio (después del montaje)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    }
  }, [order, isMounted])

  /**
   * Ítems de navegación en el orden actual.
   * Antes del montaje se devuelve el orden por defecto para coincidir con el SSR
   * y evitar hydration mismatch.
   */
  const orderedItems = useMemo(() => {
    const source = isMounted ? order : DEFAULT_ORDER
    return source
      .map((href) => NAV_ITEMS.find((item) => item.href === href))
      .filter((item): item is (typeof NAV_ITEMS)[number] => item !== undefined)
  }, [order, isMounted])

  /** Reordena moviendo `activeHref` a la posición de `overHref`. */
  const reorder = useCallback((activeHref: string, overHref: string) => {
    if (activeHref === overHref) return
    setOrder((current) => {
      const from = current.indexOf(activeHref)
      const to = current.indexOf(overHref)
      if (from === -1 || to === -1) return current
      return arrayMove(current, from, to)
    })
  }, [])

  /** Restablece el orden por defecto. */
  const resetOrder = useCallback(() => {
    setOrder(DEFAULT_ORDER)
  }, [])

  return { orderedItems, order, isMounted, reorder, resetOrder }
}
