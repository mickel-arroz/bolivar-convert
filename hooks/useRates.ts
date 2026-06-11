'use client'

import { useState, useEffect, useCallback } from 'react'
import { getVEDataString } from '@/lib/utils'
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

      // Guardar en cache con la fecha de hoy en VE
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: newRates,
        fetchDate: getVEDataString()
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
      const today = getVEDataString()

      if (cached) {
        const { rates: cachedRates, fetchDate } = JSON.parse(cached)
        
        if (fetchDate === today) {
          setRates(cachedRates)
          setIsStale(false)
          setLoading(false)
          return
        } else {
          // Data de otro día, intentar actualizar pero mostrar vieja mientras tanto
          setRates(cachedRates)
          setIsStale(true)
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
