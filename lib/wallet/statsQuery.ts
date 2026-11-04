import type { CurrencyId } from '@/constants/currencies'
import type { RateId } from '@/constants/rates'
import type { TimeRange } from '@/hooks/useWallet'
import { isCurrencyId } from './displayCurrency'

const TIME_RANGES: readonly TimeRange[] = ['1m', '6m', '1y', 'all']
const STATS_RATE_SOURCES: readonly RateId[] = ['bcvUsd', 'binanceUsdAvg']

/** Con qué se calculan unas estadísticas: lo que el usuario tiene elegido en la pestaña. */
export interface StatsParams {
  timeRange: TimeRange
  displayCurrency: CurrencyId
  statsRateSource: RateId
}

/**
 * La URL de Estadísticas lleva la moneda y la fuente elegidas, no solo el Periodo: así un
 * cambio se consulta al instante, sin esperar a que se guarde en el perfil.
 */
export function statsUrl(params: StatsParams): string {
  const qs = new URLSearchParams({
    range: params.timeRange,
    currency: params.displayCurrency,
    source: params.statsRateSource,
  })
  return `/api/wallet/stats?${qs}`
}

/** Lo que llega en la URL. Moneda y fuente desconocidas quedan sin elegir (las da el perfil). */
export function parseStatsQuery(
  query: URLSearchParams
): Pick<StatsParams, 'timeRange'> & Partial<Omit<StatsParams, 'timeRange'>> {
  const range = query.get('range')
  const currency = query.get('currency')
  const source = query.get('source')
  return {
    timeRange: TIME_RANGES.includes(range as TimeRange) ? (range as TimeRange) : '1m',
    displayCurrency: isCurrencyId(currency) ? currency : undefined,
    statsRateSource: STATS_RATE_SOURCES.includes(source as RateId) ? (source as RateId) : undefined,
  }
}

/** Si unas estadísticas se calcularon con lo que está elegido; si no, son viejas. */
export function isStatsFor(data: { params: StatsParams }, selection: StatsParams): boolean {
  return (
    data.params.timeRange === selection.timeRange &&
    data.params.displayCurrency === selection.displayCurrency &&
    data.params.statsRateSource === selection.statsRateSource
  )
}
