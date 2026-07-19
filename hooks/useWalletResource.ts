'use client'

import { useEffect, useState } from 'react'
import { notify } from '@/lib/notify'

interface WalletResource<T> {
  data: T | null
  loading: boolean
  error: boolean
}

/**
 * Consulta un endpoint de la billetera y re-consulta cuando cambia `url`
 * (p. ej. página o rango en el query) o `version` (señal `syncedVersion` de
 * `useWallet` tras persistir cambios). Devuelve `{ data, loading, error }`.
 */
export function useWalletResource<T>(url: string, version: number): WalletResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setError(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('request failed')
        return r.json()
      })
      .then((d: T) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        notify.error('No se pudieron cargar los datos', 'Revisa tu conexión e intenta de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [url, version])

  return { data, loading, error }
}
