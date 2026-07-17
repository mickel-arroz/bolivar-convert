'use client'

import { WifiOffIcon } from '@/components/icons'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Indicador de conexión. Sin caché de tasas, offline simplemente muestra un aviso
 * (los datos vienen siempre en vivo de nuestra API).
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOffIcon className="w-4 h-4 shrink-0" />
        <span>Modo offline · sin conexión</span>
      </div>
    </div>
  )
}
