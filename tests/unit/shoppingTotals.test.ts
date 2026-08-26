import { describe, it, expect } from 'vitest'
import {
  computeShoppingTotals,
  type ResolvedRates,
  type ShoppingTotalsItem,
} from '@/lib/wallet/shoppingTotals'

const RATES: ResolvedRates = { VES: 1, USD: 50, EUR: 60 }

function item(over: Partial<ShoppingTotalsItem> = {}): ShoppingTotalsItem {
  return { price: '100', currency: 'VES', priority: 4, purchased: false, ...over }
}

describe('computeShoppingTotals', () => {
  it('agrupa por prioridad, ordena 1 → 4 y omite las prioridades vacías', () => {
    const totals = computeShoppingTotals(
      [
        item({ priority: 4, price: '300' }),
        item({ priority: 1, price: '500' }),
        item({ priority: 1, price: '200' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.byPriority.map((p) => p.priority)).toEqual([1, 4])
    expect(totals.byPriority[0].total).toBe(700)
    expect(totals.byPriority[1].total).toBe(300)
    expect(totals.total).toBe(1000)
  })

  it('convierte cada producto desde su propia moneda a la moneda de visualización', () => {
    const totals = computeShoppingTotals(
      [item({ priority: 1, price: '50', currency: 'USD' }), item({ priority: 2, price: '500' })],
      RATES,
      'USD'
    )

    expect(totals.byPriority[0].total).toBe(50)
    expect(totals.byPriority[1].total).toBe(10)
    expect(totals.total).toBe(60)
  })

  it('acepta precios con coma decimal', () => {
    const totals = computeShoppingTotals([item({ price: '1,50' })], RATES, 'VES')
    expect(totals.total).toBe(1.5)
  })

  it('excluye los comprados del restante pero no del total', () => {
    const totals = computeShoppingTotals(
      [
        item({ priority: 1, price: '400', purchased: true }),
        item({ priority: 1, price: '100' }),
        item({ priority: 3, price: '250' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.total).toBe(750)
    expect(totals.remaining).toBe(350)
    expect(totals.byPriority[0]).toMatchObject({ priority: 1, total: 500, remaining: 100 })
  })

  it('devuelve 0 en el restante de una prioridad completamente comprada', () => {
    const totals = computeShoppingTotals([item({ priority: 2, purchased: true })], RATES, 'VES')
    expect(totals.byPriority[0].remaining).toBe(0)
  })

  it('devuelve null en las cifras pero conserva las prioridades cuando falta una tasa', () => {
    const totals = computeShoppingTotals(
      [item({ priority: 1, currency: 'USD' }), item({ priority: 3 })],
      { VES: 1, USD: 0, EUR: 60 },
      'VES'
    )

    expect(totals.total).toBeNull()
    expect(totals.remaining).toBeNull()
    expect(totals.byPriority.map((p) => p.priority)).toEqual([1, 3])
    expect(totals.byPriority[0]).toMatchObject({ total: null, remaining: null })
  })

  it('ignora la tasa faltante de una moneda que la lista no usa', () => {
    const totals = computeShoppingTotals([item({ price: '100' })], { VES: 1, USD: 0, EUR: 0 }, 'VES')
    expect(totals.total).toBe(100)
  })

  it('devuelve null si falta la tasa de la moneda de visualización', () => {
    const totals = computeShoppingTotals([item({ price: '100' })], { VES: 1, USD: 0, EUR: 60 }, 'USD')
    expect(totals.total).toBeNull()
  })

  it('normaliza una prioridad inválida a 4', () => {
    const totals = computeShoppingTotals([item({ priority: 9 }), item({ priority: 0 })], RATES, 'VES')
    expect(totals.byPriority.map((p) => p.priority)).toEqual([4])
    expect(totals.byPriority[0].total).toBe(200)
  })

  it('no arrastra el redondeo de las filas al total (ADR 0001)', () => {
    const totals = computeShoppingTotals(
      [
        item({ priority: 1, price: '0,01', currency: 'USD' }),
        item({ priority: 2, price: '0,01', currency: 'USD' }),
        item({ priority: 3, price: '0,01', currency: 'USD' }),
        item({ priority: 4, price: '0,01', currency: 'USD' }),
      ],
      RATES,
      'EUR'
    )

    const round = (n: number) => Math.round(n * 100) / 100
    const sumOfRows = totals.byPriority.reduce((acc, p) => acc + round(p.total ?? 0), 0)

    expect(totals.total).not.toBeNull()
    expect(Math.abs(sumOfRows - round(totals.total ?? 0))).toBeLessThanOrEqual(0.02)
  })

  it('devuelve una lista vacía de prioridades cuando no hay productos', () => {
    const totals = computeShoppingTotals([], RATES, 'VES')
    expect(totals.byPriority).toEqual([])
    expect(totals.total).toBe(0)
    expect(totals.remaining).toBe(0)
  })
})
