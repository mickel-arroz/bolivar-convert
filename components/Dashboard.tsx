'use client'

import { ClockIcon, RefreshIcon, AlertIcon } from '@/components/icons'
import { RateCard } from '@/components/cards/RateCard'
import { RateDifferenceCard } from '@/components/cards/RateDifferenceCard'
import { RateCardSkeleton } from '@/components/cards/RateCardSkeleton'
import { RateDifferenceSkeleton } from '@/components/cards/RateDifferenceSkeleton'
import { cn } from '@/lib/utils'
import { RATE_CARDS_CONFIG, Rates } from '@/constants/rates'
import { useRates } from '@/hooks/useRates'

export function Dashboard() {
  const { rates, loading, isStale, error, fetchRates, formatLastUpdate } = useRates()

  return (
    <div className="flex flex-col gap-10 pb-8 animate-in fade-in zoom-in-95 duration-500">
      {/* 1. Título principal (H1) */}
      <div className="flex flex-col items-center justify-center text-center gap-4 pt-8 md:pt-12">
        <div className={cn(
          "flex flex-col sm:flex-row items-center gap-y-1 sm:gap-x-2 text-sm px-4 py-2 rounded-lg border transition-colors mb-4",
          isStale 
            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" 
            : "bg-secondary/50 text-muted-foreground border-border/50"
        )}>
          <div className="flex items-center gap-2">
            {isStale ? <AlertIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4 text-primary" />}
            <span className="whitespace-nowrap">
              {isStale ? 'Mostrando datos antiguos: ' : 'Última actualización: '}
            </span>
          </div>
          <strong>{formatLastUpdate(rates.lastUpdate)}</strong>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
          El valor del Bolívar,
          <br className="hidden md:block" /> preciso y al instante.
        </h1>
      </div>

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

      {/* 3. Subtítulo o descripción */}
      <div className="flex flex-col items-center justify-center text-center gap-6 pb-8">
        <p className="text-lg text-muted-foreground max-w-150">
          Monitorear la tasa de cambio oficial del <a href="https://www.bcv.org.ve" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-medium hover:underline">Banco Central de Venezuela</a> y
          el mercado P2P de <a href="https://www.binance.com/es" target="_blank" rel="noopener noreferrer" className="text-yellow-600 font-medium hover:underline">Binance</a> en una sola plataforma.
        </p>

        <div className="flex flex-col items-center gap-4">
          {(isStale || error) && (
            <button
              onClick={() => fetchRates()}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <RefreshIcon className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? 'Actualizando...' : 'Reintentar actualización'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
