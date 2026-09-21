'use client'

import { useEffect, useState } from 'react'
import { GENERIC_ADVICE, isAdviceStale, type Advice, type StoredAdvice } from '@/lib/wallet/advice'

/**
 * Guardia compartida entre pestañas: mientras haya una actualización en vuelo, entrar
 * a la otra pestaña no dispara otra. Es de cliente, así que la misma persona con dos
 * dispositivos a la vez puede gastar dos llamadas; se acepta (ADR 0003).
 */
let refreshInFlight = false

/**
 * El consejo de la pestaña: **mostrar primero, actualizar después**.
 *
 * Pinta de inmediato lo guardado (o el texto genérico si no hay nada) y, sin indicador
 * de carga, pide una actualización cuando lo guardado pasó de 7 días. Lo que llega
 * **no** reemplaza el texto en pantalla: se ve en la visita siguiente.
 */
export function useAdvice(): { advice: Advice; loaded: boolean } {
  const [stored, setStored] = useState<StoredAdvice | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      if (refreshInFlight) return
      refreshInFlight = true
      fetch('/api/wallet/advice', { method: 'POST' })
        .catch(() => {
          /* el consejo nuevo puede esperar a la próxima visita */
        })
        .finally(() => {
          refreshInFlight = false
        })
    }

    fetch('/api/wallet/advice')
      .then((r) => {
        if (!r.ok) throw new Error('request failed')
        return r.json()
      })
      .then((data: { advice: StoredAdvice | null }) => {
        if (cancelled) return
        setStored(data.advice ?? null)
        if (isAdviceStale(data.advice?.generatedAt)) refresh()
      })
      .catch(() => {
        /* sin consejo guardado ni conexión: se muestra el genérico */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { advice: stored ?? GENERIC_ADVICE, loaded }
}
