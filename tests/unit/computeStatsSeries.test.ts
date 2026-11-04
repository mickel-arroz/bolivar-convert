import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeStats, type StatsInput } from '@/lib/wallet/compute'
import type { Account, Transaction, TimeRange } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '2026-11-04' }

const account: Account = {
  id: 'a',
  name: 'Banco',
  currency: 'USD',
  openingBalance: '100',
  icon: 'bank',
  createdAt: '2020-01-01T00:00:00.000Z',
}

const tx = (date: string, type: 'income' | 'expense', amount: string): Transaction => ({
  id: `${date}-${type}-${amount}`,
  type,
  accountId: 'a',
  categoryId: 'cat',
  amount,
  date,
  createdAt: `${date}T00:00:00.000Z`,
})

const input = (transactions: Transaction[]): StatsInput => ({
  accounts: [account],
  transactions,
  transfers: [],
  categories: [],
  budgets: [],
  budgetTransfers: [],
})

const stats = (transactions: Transaction[], timeRange: TimeRange) =>
  computeStats(input(transactions), RATES, {
    displayCurrency: 'USD',
    statsRateSource: 'bcvUsd',
    timeRange,
  })

describe('computeStats — series según el rango', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 4, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('1M agrupa por semana y rellena las semanas sin movimientos', () => {
    const s = stats([tx('2026-10-10', 'expense', '30'), tx('2026-11-03', 'income', '50')], '1m')

    expect(s.seriesGranularity).toBe('week')
    expect(s.monthlySeries.map((p) => p.month)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ])
    expect(s.monthlySeries[1]).toMatchObject({ expense: 30, income: 0 })
    expect(s.monthlySeries[5]).toMatchObject({ income: 50, expense: 0 })
    expect(s.netWorthSeries.map((p) => p.value)).toEqual([100, 70, 70, 70, 70, 120])
  })

  it('6M agrupa por mes, de punta a punta del rango', () => {
    const s = stats([tx('2026-08-15', 'expense', '10')], '6m')

    expect(s.seriesGranularity).toBe('month')
    expect(s.monthlySeries.map((p) => p.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
  })

  it('Todo con más de 2 años de historia agrupa por trimestre', () => {
    const s = stats([tx('2023-02-01', 'income', '10'), tx('2026-11-01', 'expense', '5')], 'all')

    expect(s.seriesGranularity).toBe('quarter')
    expect(s.monthlySeries[0]).toMatchObject({ month: '2023-Q1', income: 10 })
    expect(s.monthlySeries.at(-1)).toMatchObject({ month: '2026-Q4', expense: 5 })
    expect(s.netWorthSeries).toHaveLength(s.monthlySeries.length)
  })

  it('Todo con poca historia sigue por mes y arranca en el primer movimiento', () => {
    const s = stats([tx('2026-09-20', 'income', '10')], 'all')

    expect(s.seriesGranularity).toBe('month')
    expect(s.monthlySeries.map((p) => p.month)).toEqual(['2026-09', '2026-10', '2026-11'])
  })
})
