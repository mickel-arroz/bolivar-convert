import { describe, it, expect } from 'vitest'
import { buildAdvicePayload, buildAdvicePrompt, type AdviceInput } from '@/lib/wallet/advicePayload'
import { ADVICE_MAX_LENGTH, ADVICE_PERIODS } from '@/lib/wallet/advice'
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

  it('lleva los totales por categoría de cada período, con el nombre que escribió el usuario', () => {
    const payload = buildAdvicePayload(input(), RATES)

    for (const period of ADVICE_PERIODS) {
      expect(payload.periods[period].categories).toContainEqual({ name: 'Comida', kind: 'expense', total: 120 })
    }
  })

  it('cada período cuenta solo los movimientos de su rango', () => {
    const hace3Meses = new Date()
    hace3Meses.setMonth(hace3Meses.getMonth() - 3)
    const fecha = hace3Meses.toISOString().slice(0, 10)
    const payload = buildAdvicePayload(
      input({
        transactions: [
          {
            id: 'tx-viejo',
            type: 'income',
            accountId: 'acc1',
            categoryId: 'cat_salary',
            amount: '500',
            date: fecha,
            createdAt: `${fecha}T10:00:00.000Z`,
          },
        ],
        categories: [{ id: 'cat_salary', name: 'Sueldo', kind: 'income', icon: 'salary' }],
      }),
      RATES
    )

    expect(payload.periods['1m'].income).toBe(0)
    expect(payload.periods['6m'].income).toBe(500)
    expect(payload.periods['1y'].income).toBe(500)
    expect(payload.periods.all.income).toBe(500)
  })

  it('lleva el avance de cada presupuesto y de cada meta', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.budgets).toEqual([
      { category: 'Comida', limit: 200, spent: 120, currency: 'USD' },
    ])
    expect(payload.goals).toEqual([
      {
        name: 'Viaje a Mérida',
        saved: 300,
        target: 1000,
        missing: 700,
        currency: 'USD',
      },
    ])
  })

  it('lleva el patrimonio una vez y los ingresos y gastos totales de cada período', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.netWorth).toBe(880)
    expect(Object.keys(payload.periods)).toEqual([...ADVICE_PERIODS])
    expect(payload.periods['1m']).toMatchObject({ income: 0, expense: 120 })
  })

  it('lleva el Restante por pagar de cada lista y el Restante total por pagar', () => {
    const payload = buildAdvicePayload(input(), RATES)

    expect(payload.shopping).toEqual({ lists: [{ name: 'Mercado', remaining: 50 }], remaining: 50 })
  })

  it('lleva lo aportado a cada plan dentro del período, neto de retiros', () => {
    const payload = buildAdvicePayload(
      input({
        goalContributions: [
          { id: 'old', goalId: 'goal1', amount: '500', date: '2020-01-10', createdAt: '2020-01-10T00:00:00.000Z' },
          { id: 'in', goalId: 'goal1', amount: '300', date: today, createdAt: `${today}T11:00:00.000Z` },
          { id: 'out', goalId: 'goal1', amount: '-50', date: today, createdAt: `${today}T12:00:00.000Z` },
        ],
      }),
      RATES
    )

    expect(payload.goals[0]).toMatchObject({ saved: 750 })
    expect(payload.periods['1m'].goals).toEqual([{ name: 'Viaje a Mérida', contributed: 250, currency: 'USD' }])
    expect(payload.periods.all.goals).toEqual([{ name: 'Viaje a Mérida', contributed: 750, currency: 'USD' }])
  })

  it('lo que le falta a un plan nunca es negativo, y sin Meta no hay nada que alcanzar', () => {
    const payload = buildAdvicePayload(
      input({
        goals: [
          { id: 'goal1', name: 'Viaje', currency: 'USD', target: '100', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'goal2', name: 'Colchón', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
      RATES
    )

    expect(payload.goals.map((g) => [g.name, g.missing])).toEqual([
      ['Viaje', 0],
      ['Colchón', null],
    ])
  })

  it('si falta una tasa, ninguna lista da su Restante por pagar, igual que el total', () => {
    const payload = buildAdvicePayload(
      input({
        shoppingLists: [
          { id: 'l1', name: 'Mercado', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'l2', name: 'Europa', createdAt: '2026-01-02T00:00:00.000Z' },
        ],
        shoppingItems: [
          { id: 'a', listId: 'l1', title: 'Harina', price: '50', currency: 'USD', priority: 1, purchased: false, createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'b', listId: 'l2', title: 'Tren', price: '30', currency: 'EUR', priority: 1, purchased: false, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
      { ...RATES, bcvEur: '---' }
    )

    expect(payload.shopping).toEqual({
      lists: [
        { name: 'Mercado', remaining: null },
        { name: 'Europa', remaining: null },
      ],
      remaining: null,
    })
  })

  it('el Restante por pagar va por lista, cada una por separado', () => {
    const payload = buildAdvicePayload(
      input({
        shoppingLists: [
          { id: 'l1', name: 'Mercado', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'l2', name: 'Farmacia', createdAt: '2026-01-02T00:00:00.000Z' },
        ],
        shoppingItems: [
          { id: 'a', listId: 'l1', title: 'Harina', price: '50', currency: 'USD', priority: 1, purchased: false, createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'b', listId: 'l2', title: 'Vitaminas', price: '30', currency: 'USD', priority: 1, purchased: false, createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'c', listId: 'l2', title: 'Gasas', price: '5', currency: 'USD', priority: 2, purchased: true, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
      RATES
    )

    expect(payload.shopping).toEqual({
      lists: [
        { name: 'Mercado', remaining: 50 },
        { name: 'Farmacia', remaining: 30 },
      ],
      remaining: 80,
    })
    expect(JSON.stringify(payload)).not.toContain('Vitaminas')
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
    expect(payload.periods['1m'].categories).toEqual([])
    expect(payload.shopping).toEqual({ lists: [], remaining: 0 })
  })
})

describe('buildAdvicePrompt', () => {
  it('habla de planes de ahorro con Meta opcional, no de metas de ahorro', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('planes de ahorro')
    expect(prompt).not.toMatch(/metas? de ahorro|sus metas/i)
  })

  it('pide los dos párrafos con el límite de longitud', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('"stats"')
    expect(prompt).toContain('"budget"')
    expect(prompt).toContain(String(ADVICE_MAX_LENGTH))
  })

  it('fija la Voz del consejo: cercana, tuteando y a lo sumo un modismo', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('venezolano')
    expect(prompt).toContain('tuteando')
    expect(prompt).toContain('cercano')
    expect(prompt).toContain('a lo sumo un modismo venezolano')
  })

  it('pide en Estadísticas métricas globales y recomendaciones, no el detalle de gastos menores', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('ingresos')
    expect(prompt).toContain('gastos totales')
    expect(prompt).toContain('patrimonio')
    expect(prompt).toContain('a dónde asignar')
    expect(prompt).toContain('No enumeres los gastos menores')
  })

  it('pide en Estadísticas comentar el avance de los planes de ahorro y lo pendiente en listas de compras', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))
    const statsLine = prompt.split('\n').find((l) => l.startsWith('- "stats"')) ?? ''

    for (const period of ADVICE_PERIODS) expect(statsLine).toContain(`"${period}"`)
    expect(statsLine).toContain('"periods"')
    expect(statsLine).toContain('planes de ahorro')
    expect(statsLine).toContain('cuánto le falta')
    expect(statsLine).toContain('listas de compras')
    expect(statsLine).toContain('sin enumerar')
  })

  it('exige que toda cifra de dinero diga su moneda', () => {
    const payload = buildAdvicePayload(input(), RATES)
    const prompt = buildAdvicePrompt(payload)

    expect(prompt).toContain('cifra de dinero')
    expect(prompt).toContain('a qué moneda se refiere')
    expect(prompt).toContain('bolívares, dólares o euros')
    // Y le recuerda cuál es la moneda de los datos.
    expect(prompt).toContain(`Usa la moneda de los datos: ${payload.currency}`)
  })

  it('exige que todo porcentaje lleve su símbolo %', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('porcentaje')
    expect(prompt).toContain('símbolo "%"')
  })

  it('incluye los agregados y ningún detalle de transacciones', () => {
    const prompt = buildAdvicePrompt(buildAdvicePayload(input(), RATES))

    expect(prompt).toContain('Viaje a Mérida')
    expect(prompt).toContain('Banco Mercantil')
    expect(prompt).not.toContain('Arepas del secreto')
  })
})
