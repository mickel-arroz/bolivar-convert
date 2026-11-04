import { describe, it, expect } from 'vitest'
import { budgetUsage, rankBudgetsByUsage } from '@/lib/wallet/compute'
import type { Budget, BudgetStatusRow } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'
import type { CurrencyId } from '@/constants/currencies'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }

function row(
  name: string,
  opts: { currency?: CurrencyId; limit: number; carryover?: number; actual: number; carriedDeficit?: number }
): BudgetStatusRow {
  const carryover = opts.carryover ?? 0
  const carriedDeficit = opts.carriedDeficit ?? 0
  const effectiveLimit = opts.limit + carryover
  return {
    budget: { id: name, templateId: 't', categoryId: name, month: '2026-11', limit: String(opts.limit), currency: opts.currency ?? 'VES' } as Budget,
    categoryName: name,
    categoryIcon: 'other',
    actual: opts.actual,
    limit: opts.limit,
    carryover,
    carriedDeficit,
    effectiveLimit,
    ratio: effectiveLimit > 0 ? opts.actual / effectiveLimit : 0,
    isOver: opts.actual > Math.max(effectiveLimit, 0),
  }
}

describe('budgetUsage', () => {
  it('suma lo gastado contra el total disponible en la moneda de visualización', () => {
    const usage = budgetUsage(
      [row('Comida', { currency: 'USD', limit: 10, actual: 5 }), row('Ocio', { limit: 400, actual: 100 })],
      'VES',
      RATES,
      'bcvUsd'
    )

    expect(usage.currency).toBe('VES')
    expect(usage.total).toBe(800)
    expect(usage.spent).toBe(300)
    expect(usage.ratio).toBeCloseTo(0.375)
  })

  it('el Déficit arrastrado no cuenta como gastado; el extra sí suma al disponible', () => {
    const usage = budgetUsage(
      [row('Comida', { limit: 100, carryover: 20, actual: 70, carriedDeficit: 30 })],
      'VES',
      RATES,
      'bcvUsd'
    )

    expect(usage.total).toBe(120)
    expect(usage.spent).toBe(40)
  })

  it('cuenta los presupuestos al día y los sobrepasados', () => {
    const usage = budgetUsage(
      [
        row('A', { limit: 100, actual: 100 }),
        row('B', { limit: 100, actual: 150 }),
        row('C', { limit: 0, actual: 5 }),
      ],
      'VES',
      RATES,
      'bcvUsd'
    )

    expect(usage.onTrack).toBe(1)
    expect(usage.over).toBe(2)
  })

  it('sin total disponible el porcentaje es 0', () => {
    expect(budgetUsage([row('A', { limit: 0, actual: 0 })], 'VES', RATES, 'bcvUsd').ratio).toBe(0)
  })
})

describe('rankBudgetsByUsage', () => {
  it('ordena por % usado de mayor a menor, cada uno en su propia moneda', () => {
    const ranked = rankBudgetsByUsage([
      row('Bajo', { limit: 100, actual: 10 }),
      row('Alto', { currency: 'USD', limit: 10, actual: 12 }),
      row('Medio', { limit: 100, actual: 50 }),
    ])

    expect(ranked.map((r) => r.row.categoryName)).toEqual(['Alto', 'Medio', 'Bajo'])
    expect(ranked[0]).toMatchObject({ spent: 12, ratio: 1.2 })
  })

  it('usa lo gastado del mes, sin el Déficit arrastrado', () => {
    const [ranked] = rankBudgetsByUsage([row('A', { limit: 100, actual: 70, carriedDeficit: 30 })])

    expect(ranked.spent).toBe(40)
    expect(ranked.ratio).toBeCloseTo(0.4)
  })

  it('un presupuesto sin límite con gasto va primero', () => {
    const ranked = rankBudgetsByUsage([
      row('Lleno', { limit: 100, actual: 90 }),
      row('Sin límite', { limit: 0, actual: 5 }),
    ])

    expect(ranked[0].row.categoryName).toBe('Sin límite')
    expect(ranked[0].ratio).toBe(Infinity)
  })
})

describe('sobrepasado en la card, sin el Déficit arrastrado', () => {
  const soloDeficit = row('Deuda', { limit: 100, actual: 130, carriedDeficit: 120 })
  const pasado = row('Pasado', { limit: 100, actual: 150 })

  it('un presupuesto que solo pasa el límite por el Déficit arrastrado no cuenta como sobrepasado', () => {
    const usage = budgetUsage([soloDeficit, pasado], 'VES', RATES, 'bcvUsd')

    expect(usage.over).toBe(1)
    expect(usage.onTrack).toBe(1)
  })

  it('el color de cada fila sigue el mismo criterio que su %', () => {
    const ranked = rankBudgetsByUsage([soloDeficit, pasado])

    expect(ranked.map((r) => [r.row.categoryName, r.isOver])).toEqual([
      ['Pasado', true],
      ['Deuda', false],
    ])
  })
})
