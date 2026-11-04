import { describe, it, expect } from 'vitest'
import { computePlansAndListsStats } from '@/lib/wallet/statsPlansLists'
import type { Goal, GoalContribution, ShoppingList, ShoppingListItem } from '@/hooks/useWallet'
import type { ResolvedRates } from '@/lib/wallet/shoppingTotals'

const RATES: ResolvedRates = { VES: 1, USD: 40, EUR: 50 }

const goal = (id: string, extra: Partial<Goal> = {}): Goal => ({
  id,
  name: id,
  currency: 'USD',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const contribution = (goalId: string, amount: string): GoalContribution => ({
  id: `${goalId}-${amount}`,
  goalId,
  amount,
  date: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
})

const list = (id: string): ShoppingList => ({
  id,
  name: id,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const item = (
  listId: string,
  price: string,
  extra: Partial<ShoppingListItem> = {}
): ShoppingListItem => ({
  id: `${listId}-${price}-${extra.currency ?? 'USD'}`,
  listId,
  title: 'x',
  price,
  currency: 'USD',
  priority: 4,
  purchased: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const EMPTY_INPUT = {
  goals: [],
  goalContributions: [],
  shoppingLists: [],
  shoppingItems: [],
}

describe('computePlansAndListsStats — Planes de ahorro', () => {
  it('suma los aportes y retiros de cada plan activo frente a su Meta', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('viaje', { target: '500' }), goal('colchon')],
        goalContributions: [
          contribution('viaje', '200'),
          contribution('viaje', '-50'),
          contribution('colchon', '30'),
        ],
      },
      RATES,
      'USD'
    )
    expect(savingsPlans).toEqual([
      expect.objectContaining({ goalId: 'colchon', saved: 30, target: null }),
      expect.objectContaining({ goalId: 'viaje', saved: 150, target: 500, currency: 'USD' }),
    ])
  })

  it('deja fuera los planes completados', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('hecho', { target: '10', completedAt: '2026-10-02' })],
      },
      RATES,
      'USD'
    )
    expect(savingsPlans).toEqual([])
  })

  it('los planes con Meta alcanzada van después de los demás', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('lleno', { target: '100' }), goal('encurso', { target: '100' })],
        goalContributions: [contribution('lleno', '100'), contribution('encurso', '10')],
      },
      RATES,
      'USD'
    )
    expect(savingsPlans.map((p) => p.goalId)).toEqual(['encurso', 'lleno'])
  })
})

describe('computePlansAndListsStats — Listas de compras', () => {
  it('da el Restante por pagar de cada lista en la moneda de visualización y el total', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [list('mercado'), list('casa')],
        shoppingItems: [
          item('mercado', '10'),
          item('mercado', '400', { currency: 'VES' }),
          item('mercado', '99', { purchased: true }),
          item('casa', '5', { currency: 'EUR' }),
        ],
      },
      RATES,
      'USD'
    )
    expect(shoppingLists.rows).toEqual([
      expect.objectContaining({ listId: 'mercado', remaining: 20 }),
      expect.objectContaining({ listId: 'casa', remaining: 6.25 }),
    ])
    expect(shoppingLists.remaining).toBe(26.25)
  })

  it('deja fuera las listas sin nada por pagar', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [list('vacia'), list('pagada')],
        shoppingItems: [item('pagada', '10', { purchased: true })],
      },
      RATES,
      'USD'
    )
    expect(shoppingLists.rows).toEqual([])
    expect(shoppingLists.remaining).toBe(0)
  })

  it('ordena las listas por fecha de creación, como en la pestaña de listas', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [
          { ...list('nueva'), createdAt: '2026-05-01T00:00:00.000Z' },
          { ...list('vieja'), createdAt: '2026-02-01T00:00:00.000Z' },
        ],
        shoppingItems: [item('nueva', '1'), item('vieja', '1')],
      },
      RATES,
      'USD'
    )
    expect(shoppingLists.rows.map((r) => r.listId)).toEqual(['vieja', 'nueva'])
  })

  it('ignora los productos de listas que ya no existen', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [list('a')],
        shoppingItems: [item('a', '1'), item('borrada', '9')],
      },
      RATES,
      'USD'
    )
    expect(shoppingLists.rows.map((r) => r.listId)).toEqual(['a'])
    expect(shoppingLists.remaining).toBe(1)
  })

  it('sin tasa conserva las listas pendientes pero sin cifras', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [list('a')],
        shoppingItems: [item('a', '1', { currency: 'EUR' })],
      },
      { VES: 1, USD: 40, EUR: 0 },
      'USD'
    )
    expect(shoppingLists.rows).toEqual([expect.objectContaining({ listId: 'a', remaining: null })])
    expect(shoppingLists.remaining).toBeNull()
  })
})
