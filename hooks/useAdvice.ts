'use client'

import { useEffect, useState } from 'react'
import { GENERIC_ADVICE, type Advice, type StoredAdvice } from '@/lib/wallet/advice'

/**
 * La generación en vuelo, compartida entre las pestañas montadas: entrar a la otra
 * mientras corre no dispara otra, y las dos reciben lo nuevo. Entre pestañas del
 * navegador o dispositivos distintos, el que evita la segunda llamada es el reclamo
 * del día en la base (ADR 0005).
 */
let generating: Promise<StoredAdvice | null> | null = null

function generate(): Promise<StoredAdvice | null> {
  generating ??= fetch('/api/wallet/advice', { method: 'POST' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { advice: StoredAdvice | null; refreshed: boolean } | null) =>
      data?.refreshed ? data.advice : null
    )
    .catch(() => null)
    .finally(() => {
      generating = null
    })
  return generating
}

/**
 * El consejo de la pestaña: **mostrar primero, actualizar después**.
 *
 * Mientras lee lo guardado, `loaded` es `false` y la tarjeta muestra un skeleton.
 * Luego pinta lo guardado (o el texto genérico si no hay nada) y, si al usuario le toca
 * un consejo nuevo hoy, lo pide sin indicador de carga y lo pone en pantalla apenas llega.
 */
export function useAdvice(): { advice: Advice; loaded: boolean } {
  const [stored, setStored] = useState<StoredAdvice | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/wallet/advice')
      .then((r) => {
        if (!r.ok) throw new Error('request failed')
        return r.json()
      })
      .then((data: { advice: StoredAdvice | null; canAttempt: boolean }) => {
        if (cancelled) return
        setStored(data.advice ?? null)
        if (!data.canAttempt) return
        generate().then((fresh) => {
          if (fresh && !cancelled) setStored(fresh)
        })
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
