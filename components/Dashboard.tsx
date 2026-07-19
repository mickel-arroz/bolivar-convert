'use client'

import { RefreshIcon, TrendingUpIcon, WifiOffIcon } from '@/components/icons'
import { RateCard } from '@/components/cards/RateCard'
import { RateDifferenceCard } from '@/components/cards/RateDifferenceCard'
import { RateCardSkeleton } from '@/components/cards/RateCardSkeleton'
import { RateDifferenceSkeleton } from '@/components/cards/RateDifferenceSkeleton'
import { cn } from '@/lib/utils'
import { RATE_CARDS_CONFIG, Rates } from '@/constants/rates'
import { useRates } from '@/hooks/useRates'
import { PageHeader } from '@/components/PageHeader'
import { LastUpdateBadge } from '@/components/LastUpdateBadge'

export function Dashboard() {
  const { rates, previousRates, loading, isStale, isOffline, error, fetchRates, formatLastUpdate } =
    useRates()

  // Badge de variación % (tasa actual vs. registro anterior, ya provisto por /api/rates).
  const renderBadge = (id: string) => {
    const current = parseFloat(rates[id as keyof Rates] as string)
    const prev = parseFloat(previousRates[id as keyof Rates] as string)
    if (isNaN(current) || isNaN(prev) || prev === 0) return null

    const diff = current - prev
    if (Math.abs(diff) < 0.001) return null

    const percent = (Math.abs(diff) / prev) * 100
    const isUp = diff > 0

    return (
      <div className={cn("flex items-center gap-1 text-[11px] font-bold mt-1", isUp ? "text-green-500" : "text-red-500")}>
        <TrendingUpIcon className={cn("w-3 h-3", !isUp && "rotate-180")} />
        <span>{percent.toFixed(2)}%</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 pb-2 -mt-4 md:-mt-8 animate-in fade-in zoom-in-95 duration-500">
      {/* 1. Título principal (H1) */}
      <PageHeader
        title="El valor del Bolívar, preciso y al instante."
        titleClassName="text-4xl md:text-6xl font-extrabold tracking-tight"
        className="pt-0"
        badge={
          rates.lastUpdate !== '---' && !isStale && !isOffline ? (
            <LastUpdateBadge
              lastUpdate={rates.lastUpdate}
              isStale={false}
              formattedDate={formatLastUpdate(rates.lastUpdate)}
            />
          ) : undefined
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl mx-auto">
        {loading && rates.lastUpdate === '---'
          ? Array.from({ length: 3 }).map((_, i) => <RateCardSkeleton key={i} />)
          : RATE_CARDS_CONFIG.map((card) => (
            <RateCard
              key={card.id}
              label={card.label}
              icon={card.icon}
              rate={rates[card.id as keyof Rates] || '---'}
              colorClass={card.colorClass}
              badge={card.badge}
              percentageBadge={renderBadge(card.id)}
              className={card.className}
            />
          ))
        }
      </div>

      {/* Diferencia de tasas */}
      {loading && rates.lastUpdate === '---'
        ? <RateDifferenceSkeleton />
        : <RateDifferenceCard rates={rates} />
      }

      {/* 3. Estado de conexión / reintento */}
      <div className="flex flex-col items-center justify-center text-center gap-6">
        <div className="flex flex-col items-center gap-4">
          {(isStale || error) && (
            isOffline ? (
              <span className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <WifiOffIcon className="w-4 h-4" />
                Sin conexión
              </span>
            ) : (
              <button
                onClick={() => fetchRates()}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <RefreshIcon className={cn("w-4 h-4", loading && "animate-spin")} />
                {loading ? 'Actualizando...' : 'Reintentar actualización'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
