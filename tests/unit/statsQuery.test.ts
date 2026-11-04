import { describe, it, expect } from 'vitest'
import { isStatsFor, parseStatsQuery, statsUrl } from '@/lib/wallet/statsQuery'

const query = (qs: string) => new URLSearchParams(qs)

describe('statsUrl / parseStatsQuery', () => {
  it('la URL lleva Periodo, moneda y fuente, y se lee de vuelta igual', () => {
    const url = statsUrl({
      timeRange: '6m',
      displayCurrency: 'EUR',
      statsRateSource: 'binanceUsdAvg',
    })
    expect(url).toBe('/api/wallet/stats?range=6m&currency=EUR&source=binanceUsdAvg')
    expect(parseStatsQuery(query(url.split('?')[1]))).toEqual({
      timeRange: '6m',
      displayCurrency: 'EUR',
      statsRateSource: 'binanceUsdAvg',
    })
  })

  it('valores desconocidos no pasan: el Periodo cae a 1M y moneda y fuente quedan sin elegir', () => {
    expect(parseStatsQuery(query('range=5y&currency=BTC&source=bcvEur'))).toEqual({
      timeRange: '1m',
      displayCurrency: undefined,
      statsRateSource: undefined,
    })
  })
})

describe('isStatsFor', () => {
  const selection = { timeRange: '1y', displayCurrency: 'USD', statsRateSource: 'bcvUsd' } as const

  it('los datos sirven si se calcularon con lo que está elegido', () => {
    expect(isStatsFor({ params: { ...selection } }, selection)).toBe(true)
  })

  it('cualquier diferencia los vuelve viejos', () => {
    expect(isStatsFor({ params: { ...selection, displayCurrency: 'VES' } }, selection)).toBe(false)
    expect(
      isStatsFor({ params: { ...selection, statsRateSource: 'binanceUsdAvg' } }, selection)
    ).toBe(false)
    expect(isStatsFor({ params: { ...selection, timeRange: '6m' } }, selection)).toBe(false)
  })
})
