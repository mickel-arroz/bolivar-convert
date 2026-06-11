'use client'

import { useState, useEffect, useCallback } from 'react'
import { Rates } from '@/constants/rates'

const CACHE_KEY = 'bolivar_rates_cache'

export function useRates() {
  const [rates, setRates] = useState<Rates>({
    lastUpdate: '---'
  })
  const [loading, setLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState(false)

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/rates')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const data = await response.json()
      
      const newRates: Rates = {
        bcvUsd: data.bcvUsd ? parseFloat(data.bcvUsd).toFixed(2) : '---',
        bcvEur: data.bcvEur ? parseFloat(data.bcvEur).toFixed(2) : '---',
        binanceUsdAvg: data.binanceUsdAvg ? parseFloat(data.binanceUsdAvg).toFixed(2) : '---',
        lastUpdate: data.lastUpdate || '---'
      }

      setRates(newRates)
      setIsStale(false)

      // Guardar en cache con el timestamp actual para el control de 2 horas
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: newRates,
        lastFetch: Date.now()
      }))
    } catch (err) {
      console.error('Error fetching rates:', err)
      setError(true)
      
      // Si falla, intentar usar lo que hay en cache aunque sea viejo
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { rates: cachedRates } = JSON.parse(cached)
        setRates(cachedRates)
        setIsStale(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initializeDashboard = () => {
      const cached = localStorage.getItem(CACHE_KEY)
      const now = Date.now()
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000

      if (cached) {
        try {
          const { rates: cachedRates, lastFetch } = JSON.parse(cached)
          
          // Verificar si han pasado menos de 2 horas desde el último fetch
          if (lastFetch && (now - lastFetch) < TWO_HOURS_MS) {
            setRates(cachedRates)
            setIsStale(false)
            setLoading(false)
            return
          } else {
            // Data de hace más de 2 horas, mostrarla pero marcar como stale y actualizar
            setRates(cachedRates)
            setIsStale(true)
          }
        } catch (e) {
          console.error('Error parsing cache', e)
        }
      }
      
      fetchRates()
    }

    initializeDashboard()
  }, [fetchRates])

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
        hour12: true
      })
    } catch {
      return lastUpdate
    }
  }, [])

  return {
    rates,
    loading,
    isStale,
    error,
    fetchRates,
    formatLastUpdate
  }
}
