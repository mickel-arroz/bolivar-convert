import { describe, it, expect } from 'vitest'
import {
  computeAllListsTotals,
  type AllListsItem,
  type ResolvedRates,
} from '@/lib/wallet/shoppingTotals'

const RATES: ResolvedRates = { VES: 1, USD: 50, EUR: 60 }
const NO_USD: ResolvedRates = { VES: 1, USD: 0, EUR: 60 }

const LISTS = [
  { id: 'l1', name: 'Mercado' },
  { id: 'l2', name: 'Ferretería' },
]

function item(over: Partial<AllListsItem> = {}): AllListsItem {
  return { listId: 'l1', price: '100', currency: 'VES', priority: 4, purchased: false, ...over }
}

describe('computeAllListsTotals', () => {
  it('suma el Precio total de todas las listas con monedas mezcladas', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', price: '500' }),
        item({ listId: 'l2', price: '10', currency: 'USD' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.total).toBe(1000)
    expect(totals.rows.map((r) => r.total)).toEqual([500, 500])
  })

  it('cuenta Comprados y Por comprar por lista', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', purchased: true }),
        item({ listId: 'l1', purchased: true }),
        item({ listId: 'l1' }),
        item({ listId: 'l2' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.rows[0]).toMatchObject({ name: 'Mercado', purchased: 2, pending: 1 })
    expect(totals.rows[1]).toMatchObject({ name: 'Ferretería', purchased: 0, pending: 1 })
  })

  it('el Restante total por pagar excluye los comprados', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', price: '300', purchased: true }),
        item({ listId: 'l1', price: '200' }),
        item({ listId: 'l2', price: '100' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.total).toBe(600)
    expect(totals.remaining).toBe(300)
  })

  it('una lista vacía no rompe el total ni aporta filas', () => {
    const totals = computeAllListsTotals(
      [...LISTS, { id: 'l3', name: 'Vacía' }],
      [item({ listId: 'l1', price: '250' })],
      RATES,
      'VES'
    )

    expect(totals.rows.map((r) => r.listId)).toEqual(['l1'])
    expect(totals.total).toBe(250)
  })

  it('sin ningún producto no hay filas y los totales son cero', () => {
    const totals = computeAllListsTotals(LISTS, [], RATES, 'VES')

    expect(totals.rows).toEqual([])
    expect(totals.total).toBe(0)
    expect(totals.remaining).toBe(0)
    expect(totals.incomplete).toBe(false)
  })

  it('si falta una tasa, las cifras quedan no disponibles y el total avisa que está incompleto', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', price: '500' }),
        item({ listId: 'l2', price: '10', currency: 'USD' }),
      ],
      NO_USD,
      'VES'
    )

    expect(totals.incomplete).toBe(true)
    expect(totals.total).toBeNull()
    expect(totals.remaining).toBeNull()
    // Solo la lista que necesita la tasa que falta pierde sus cifras.
    expect(totals.rows.map((r) => r.total)).toEqual([500, null])
  })

  it('con una tasa faltante los conteos de cada lista siguen siendo legibles', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', purchased: true }),
        item({ listId: 'l2', currency: 'USD', price: '3' }),
      ],
      NO_USD,
      'VES'
    )

    expect(totals.rows[0]).toMatchObject({ purchased: 1, pending: 0 })
    expect(totals.rows[1]).toMatchObject({ purchased: 0, pending: 1 })
  })

  it('el desglose global por prioridad omite las prioridades sin productos', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', priority: 1, price: '500' }),
        item({ listId: 'l2', priority: 3, price: '300' }),
        item({ listId: 'l2', priority: 1, price: '200' }),
      ],
      RATES,
      'VES'
    )

    expect(totals.byPriority.map((p) => p.priority)).toEqual([1, 3])
    expect(totals.byPriority[0].total).toBe(700)
    expect(totals.byPriority[1].total).toBe(300)
  })

  it('las filas del desglose cuadran con el total dentro de la tolerancia de ADR-0001', () => {
    // Cada fila se redondea sola y no se cuadra contra el total: hasta 0,02 de diferencia.
    const totals = computeAllListsTotals(
      LISTS,
      [
        item({ listId: 'l1', priority: 1, price: '3.333', currency: 'USD' }),
        item({ listId: 'l1', priority: 2, price: '3.333', currency: 'USD' }),
        item({ listId: 'l2', priority: 3, price: '3.333', currency: 'USD' }),
        item({ listId: 'l2', priority: 4, price: '3.333', currency: 'USD' }),
      ],
      RATES,
      'VES'
    )

    const round = (n: number) => Math.round(n * 100) / 100
    const sumOfRows = totals.byPriority.reduce((acc, r) => acc + round(r.total ?? 0), 0)
    expect(Math.abs(sumOfRows - round(totals.total ?? 0))).toBeLessThanOrEqual(0.02)
  })

  it('la condición del botón de resumen es que haya filas', () => {
    // El botón se muestra cuando hay al menos una lista con al menos un producto:
    // exactamente lo que dice `rows.length`, comprados incluidos.
    expect(computeAllListsTotals(LISTS, [], RATES, 'VES').rows).toHaveLength(0)
    expect(
      computeAllListsTotals(LISTS, [item({ purchased: true })], RATES, 'VES').rows
    ).toHaveLength(1)
  })

  it('ignora los productos de listas que ya no existen', () => {
    const totals = computeAllListsTotals(
      LISTS,
      [item({ listId: 'l1', price: '100' }), item({ listId: 'borrada', price: '999' })],
      RATES,
      'VES'
    )

    expect(totals.rows.map((r) => r.listId)).toEqual(['l1'])
    expect(totals.total).toBe(100)
  })
})
