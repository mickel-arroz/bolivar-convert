'use client'

import { useState, useEffect, useCallback } from 'react'
import { Rates } from '@/constants/rates'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Formatea un valor numérico (o string) a 2 decimales; '---' si no es válido. */
function fmt(v: unknown): string {
  if (v == null) return '---'
  const n = parseFloat(String(v))
  return isNaN(n) ? '---' : n.toFixed(2)
}

/**
 * Tasas actuales desde nuestro endpoint interno `/api/rates` (que a su vez lee el
 * historial unificado en Redis). Sin caché en localStorage: si no hay conexión, no
 * hay datos que mostrar. Expone también `previousRates` (registro anterior) para
 * calcular la variación % sin bajar todo el historial.
 */
export function useRates() {
  const [rates, setRates] = useState<Rates>({ lastUpdate: '---' })
  const [previousRates, setPreviousRates] = useState<Rates>({ lastUpdate: '---' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const isOnline = useOnlineStatus()

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/rates')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()

      setRates({
        bcvUsd: fmt(data.bcvUsd),
        bcvEur: fmt(data.bcvEur),
        binanceUsdAvg: fmt(data.binanceUsdAvg),
        lastUpdate: data.lastUpdate || '---',
      })

      const prev = data.previous ?? {}
      setPreviousRates({
        bcvUsd: fmt(prev.bcvUsd),
        bcvEur: fmt(prev.bcvEur),
        binanceUsdAvg: fmt(prev.binanceUsdAvg),
        lastUpdate: '---',
      })
    } catch (err) {
      console.error('Error fetching rates:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar al montar y reintentar al recuperar la conexión.
  useEffect(() => {
    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    fetchRates()
  }, [isOnline, fetchRates])

  const formatLastUpdate = useCallback((lastUpdate: string) => {
    if (lastUpdate === '---') return '---'
    try {
      const date = new Date(lastUpdate)
      return date.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return lastUpdate
    }
  }, [])

  return {
    rates,
    previousRates,
    loading,
    isStale: error,
    isOffline: !isOnline,
    error,
    fetchRates,
    formatLastUpdate,
  }
}
