import { describe, it, expect } from 'vitest'
import { buildAdvicePayload, buildAdvicePrompt, type AdviceInput } from '@/lib/wallet/advicePayload'
import { ADVICE_MAX_LENGTH } from '@/lib/wallet/advice'
import type { Rates } from '@/constants/rates'

const RATES: Rates = {
  bcvUsd: '50',
  bcvEur: '60',
  binanceUsdAvg: '55',
  lastUpdate: '2026-09-21T00:00:00.000Z',
}

const month = new Date().toISOString().slice(0, 7)
const today = `${month}-05`

function input(over: Partial<AdviceInput> = {}): AdviceInput {
  return {
    accounts: [
      {
        id: 'acc1',
        name: 'Banco Mercantil',
        currency: 'USD',
        openingBalance: '1000',
        icon: 'wallet',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'tx1',
        type: 'expense',
        accountId: 'acc1',
        categoryId: 'cat_food',
        amount: '120',
        note: 'Arepas del secreto en la panadería de la esquina',
        date: today,
        createdAt: `${today}T10:00:00.000Z`,
      },
    ],
    transfers: [],
    categories: [{ id: 'cat_food', name: 'Comida', kind: 'expense', icon: 'food' }],
    budgets: [
      {
        id: 'b1',
        templateId: 'tpl_default',
        categoryId: 'cat_food',
        month,
        limit: '200',
        currency: 'USD',
      },
    ],
    budgetTransfers: [],
    goals: [
      {
        id: 'goal1',
        name: 'Viaje a Mérida',
        currency: 'USD',
        target: '1000',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    goalContributions: [
      {
        id: 'gc1',
        goalId: 'goal1',
        accountId: 'acc1',
        amount: '300',
        note: 'Aporte de la quincena',
        date: today,
        createdAt: `${today}T11:00:00.000Z`,
      },
    ],
    shoppingLists: [{ id: 'l1', name: 'Mercado', createdAt: '2026-01-01T00:00:00.000Z' }],
    shoppingItems: [
      {
        id: 'it1',
        listId: 'l1',
        title: 'Harina PAN',
        price: '50',
        currency: 'USD',
        priority: 1,
        purchased: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'it2',
        listId: 'l1',
        title: 'Café',
        price: '20',
        currency: 'USD',
        priority: 2,
        purchased: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    displayCurrency: 'USD',
    statsRateSource: 'bcvUsd',
    timeRange: '1m',
    ...over,
  }
}

describe('buildAdvicePayload', () => {
  it('lleva los saldos por cuenta con su Disponible y En metas', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.accounts).toEqual([
      { name: 'Banco Mercantil', currency: 'USD', balance: 880, available: 580, inGoals: 300 },
    ])
  })

  it('lleva los totales por categoría con el nombre que escribió el usuario', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.categories).toContainEqual({ name: 'Comida', kind: 'expense', total: 120 })
  })

  it('lleva el avance de cada presupuesto y de cada meta', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.budgets).toEqual([
      { category: 'Comida', limit: 200, spent: 120, currency: 'USD' },
    ])
    expect(payload.goals).toEqual([
      { name: 'Viaje a Mérida', saved: 300, target: 1000, currency: 'USD' },
    ])
  })

  it('lleva el Restante total por pagar de las listas y sus nombres', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.shopping).toEqual({ lists: ['Mercado'], remaining: 50 })
  })

  it('no lleva ningún detalle de transacciones', () => {
    const serialized = JSON.stringify(buildAdvicePayload(input(), RATES))

    expect(serialized).not.toContain('Arepas del secreto')
    expect(serialized).not.toContain('Aporte de la quincena')
    expect(serialized).not.toContain('tx1')
    expect(serialized).not.toContain('gc1')
    expect(serialized).not.toContain('acc1')
    expect(serialized).not.toContain(today)
  })

  it('una billetera vacía produce un payload vacío pero válido', () => {
    const payload = buildAdvicePayload(
      input({
        accounts: [],
        transactions: [],
        budgets: [],
        goals: [],
        goalContributions: [],
        shoppingLists: [],
        shoppingItems: [],
      }),
      RATES
    )

    expect(payload.accounts).toEqual([])
    expect(payload.categories).toEqual([])
    expect(payload.shopping).toEqual({ lists: [], remaining: 0 })
  })
})

describe('buildAdvicePrompt', () => {
  it('pide los dos párrafos con el límite duro de longitud', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('"stats"')
    expect(prompt).toContain('"budget"')
    expect(prompt).toContain(String(ADVICE_MAX_LENGTH))
  })

  it('incluye los agregados y ningún detalle de transacciones', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('Viaje a Mérida')
    expect(prompt).toContain('Banco Mercantil')
    expect(prompt).not.toContain('Arepas del secreto')
  })
})
