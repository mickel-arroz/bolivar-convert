import { describe, it, expect } from 'vitest'
import { inPeriod, sumGoalContributions } from '@/lib/wallet/goalSums'
import { resolveRates } from '@/lib/wallet/shoppingTotals'
import type { GoalContribution } from '@/hooks/useWallet'

const NOW = new Date(2026, 10, 4, 12)

const gc = (goalId: string, amount: string, date: string): GoalContribution => ({
  id: `${goalId}-${amount}-${date}`,
  goalId,
  amount,
  date,
  createdAt: `${date}T00:00:00.000Z`,
})

describe('inPeriod', () => {
  it('Todo acepta cualquier fecha; los demás, desde el inicio del Periodo', () => {
    expect(inPeriod('all', NOW)('1999-01-01')).toBe(true)
    expect(inPeriod('1m', NOW)('2026-10-20')).toBe(true)
    expect(inPeriod('1m', NOW)('2026-09-20')).toBe(false)
  })
})

describe('sumGoalContributions', () => {
  it('suma lo ahorrado de cada plan y aparte lo aportado dentro del Periodo', () => {
    const { saved, contributed } = sumGoalContributions(
      [gc('a', '100', '2026-01-01'), gc('a', '-20', '2026-10-30'), gc('b', '5', '2026-11-01')],
      inPeriod('1m', NOW)
    )
    expect(Object.fromEntries(saved)).toEqual({ a: 80, b: 5 })
    expect(Object.fromEntries(contributed)).toEqual({ a: -20, b: 5 })
  })
})

describe('resolveRates', () => {
  it('da los bolívares por unidad con la fuente elegida para el dólar', () => {
    const rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '2026-11-04' }
    expect(resolveRates(rates, 'bcvUsd')).toEqual({ VES: 1, USD: 40, EUR: 45 })
    expect(resolveRates(rates, 'binanceUsdAvg')).toEqual({ VES: 1, USD: 42, EUR: 45 })
  })
})
