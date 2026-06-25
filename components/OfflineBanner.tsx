'use client'

import { useState, useEffect } from 'react'
import { WifiOffIcon, AlertIcon } from '@/components/icons'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const CACHE_KEY = 'bolivar_rates_cache'
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return isoString
  }
}

interface CacheState {
  lastUpdate: string | null
  isStale: boolean
}

function readCacheState(): CacheState {
  if (typeof window === 'undefined') return { lastUpdate: null, isStale: false }
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { rates, lastFetch } = JSON.parse(raw)
      const isStale = !lastFetch || (Date.now() - lastFetch) >= TWO_HOURS_MS
      const lastUpdate = rates?.lastUpdate && rates.lastUpdate !== '---' ? rates.lastUpdate : null
      return { lastUpdate, isStale }
    }
  } catch {
    // Ignorar error de parseo
  }
  return { lastUpdate: null, isStale: false }
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [cache, setCache] = useState<CacheState>(readCacheState)

  useEffect(() => {
    const refresh = () => setCache(readCacheState())
    window.addEventListener('rates-updated', refresh)
    return () => window.removeEventListener('rates-updated', refresh)
  }, [])

  const { lastUpdate, isStale } = cache

  if (!lastUpdate) return null

  const formattedDate = formatDate(lastUpdate)

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-0.5 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <WifiOffIcon className="w-4 h-4 shrink-0" />
            <span>Modo offline</span>
          </div>
          <span className="text-xs text-amber-600/80 dark:text-amber-500/80">
            Última actualización: {formattedDate}
          </span>
        </div>
      </div>
    )
  }

  if (isStale) {
    return (
      <div
        role="status"
        className="w-full bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-4 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-0.5 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertIcon className="w-4 h-4 shrink-0" />
            <span>Mostrando datos no actualizados</span>
          </div>
          <span className="text-xs text-yellow-600/80 dark:text-yellow-500/80">
            Última actualización: {formattedDate}
          </span>
        </div>
      </div>
    )
  }

  // Con conexión y datos al día, la "última actualización" la muestra el header
  // compartido (LastUpdateBadge); aquí no se duplica.
  return null
}
