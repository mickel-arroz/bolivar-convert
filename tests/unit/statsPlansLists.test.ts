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
    expect(savingsPlans.rows).toEqual([
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
    expect(savingsPlans.rows).toEqual([])
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
    expect(savingsPlans.rows.map((p) => p.goalId)).toEqual(['encurso', 'lleno'])
  })

  it('el progreso hacia las Metas suma los planes con Meta en la moneda de visualización', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [
          goal('viaje', { target: '100' }),
          goal('carro', { target: '5000', currency: 'VES' }),
          goal('sinmeta'),
        ],
        goalContributions: [
          contribution('viaje', '50'),
          contribution('carro', '2000'),
          contribution('sinmeta', '999'),
        ],
      },
      RATES,
      'USD'
    )
    expect(savingsPlans.progress).toEqual({ saved: 100, target: 225, reached: 0, withTarget: 2 })
  })

  it('lo ahorrado de más en un plan no tapa lo que le falta a otro', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('lleno', { target: '100' }), goal('vacio', { target: '100' })],
        goalContributions: [contribution('lleno', '300')],
      },
      RATES,
      'USD'
    )
    expect(savingsPlans.progress).toEqual({ saved: 100, target: 200, reached: 1, withTarget: 2 })
  })

  it('sin planes con Meta, o sin tasa, no hay progreso', () => {
    const sinMeta = computePlansAndListsStats({ ...EMPTY_INPUT, goals: [goal('a')] }, RATES, 'USD')
    expect(sinMeta.savingsPlans.progress).toBeNull()

    const sinTasa = computePlansAndListsStats(
      { ...EMPTY_INPUT, goals: [goal('a', { target: '10', currency: 'EUR' })] },
      { VES: 1, USD: 40, EUR: 0 },
      'USD'
    )
    expect(sinTasa.savingsPlans.progress).toBeNull()
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
      expect.objectContaining({ listId: 'mercado', remaining: 20, pending: 2 }),
      expect.objectContaining({ listId: 'casa', remaining: 6.25, pending: 1 }),
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

describe('computePlansAndListsStats — según el rango', () => {
  const NOW = new Date(2026, 10, 4, 12)
  const dated = (goalId: string, amount: string, date: string): GoalContribution => ({
    ...contribution(goalId, amount),
    id: `${goalId}-${amount}-${date}`,
    date,
  })
  const bought = (listId: string, price: string, date: string): ShoppingListItem =>
    item(listId, price, {
      id: `${listId}-${price}-${date}`,
      purchased: true,
      purchase: { accountId: 'a', cost: price, transactionId: 't', date },
    })

  it('cada plan dice cuánto se le aportó en el periodo y el resumen lo suma convertido', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('viaje', { target: '500' }), goal('carro', { currency: 'VES' })],
        goalContributions: [
          dated('viaje', '200', '2026-05-01'),
          dated('viaje', '50', '2026-10-20'),
          dated('viaje', '-10', '2026-11-01'),
          dated('carro', '400', '2026-10-25'),
        ],
      },
      RATES,
      'USD',
      '1m',
      NOW
    )
    expect(savingsPlans.rows).toEqual([
      expect.objectContaining({ goalId: 'carro', saved: 400, contributed: 400 }),
      expect.objectContaining({ goalId: 'viaje', saved: 240, contributed: 40 }),
    ])
    expect(savingsPlans.contributed).toBe(50)
  })

  it('con Todo cuenta todos los aportes', () => {
    const { savingsPlans } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        goals: [goal('viaje')],
        goalContributions: [
          dated('viaje', '200', '2020-05-01'),
          dated('viaje', '50', '2026-10-20'),
        ],
      },
      RATES,
      'USD',
      'all',
      NOW
    )
    expect(savingsPlans.rows[0]).toMatchObject({ contributed: 250 })
  })

  it('cada lista dice lo comprado en el periodo, y aparece aunque ya no le quede nada', () => {
    const { shoppingLists } = computePlansAndListsStats(
      {
        ...EMPTY_INPUT,
        shoppingLists: [list('mercado'), list('casa'), list('vieja')],
        shoppingItems: [
          item('mercado', '10'),
          bought('mercado', '400', '2026-10-30'),
          bought('casa', '5', '2026-11-02'),
          bought('vieja', '99', '2026-01-02'),
        ],
      },
      { VES: 1, USD: 40, EUR: 50 },
      'USD',
      '1m',
      NOW
    )
    expect(shoppingLists.rows).toEqual([
      expect.objectContaining({ listId: 'mercado', remaining: 10, purchased: 400 }),
      expect.objectContaining({ listId: 'casa', remaining: 0, purchased: 5, pending: 0 }),
    ])
    expect(shoppingLists.purchased).toBe(405)
  })
})
