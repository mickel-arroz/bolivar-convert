import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { budgetRangeMonths, budgetStatusForRange } from '@/lib/wallet/compute'
import type { Account, Budget, Category, Transaction } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '2026-11-04' }

const account: Account = {
  id: 'a',
  name: 'Banco',
  currency: 'USD',
  openingBalance: '0',
  icon: 'bank',
  createdAt: '2020-01-01T00:00:00.000Z',
}

const food: Category = { id: 'food', name: 'Comida', icon: 'food', kind: 'expense' } as Category

const budget = (month: string, limit: string, extra: Partial<Budget> = {}): Budget => ({
  id: `food-${month}`,
  templateId: 't',
  categoryId: 'food',
  month,
  limit,
  currency: 'USD',
  ...extra,
})

const expense = (date: string, amount: string): Transaction => ({
  id: `${date}-${amount}`,
  type: 'expense',
  accountId: 'a',
  categoryId: 'food',
  amount,
  date,
  createdAt: `${date}T00:00:00.000Z`,
})

const statusFor = (budgets: Budget[], transactions: Transaction[], months: string[]) =>
  budgetStatusForRange(
    { accounts: [account], categories: [food], budgets, transactions, budgetTransfers: [] },
    RATES,
    'bcvUsd',
    months
  )

describe('budgetRangeMonths', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 4, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('1M es el mes actual; 6M y 1A los meses del rango', () => {
    expect(budgetRangeMonths('1m', [])).toEqual(['2026-11'])
    expect(budgetRangeMonths('6m', [])).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    expect(budgetRangeMonths('1y', [])).toHaveLength(13)
  })

  it('Todo arranca en el primer mes con presupuesto', () => {
    expect(budgetRangeMonths('all', [budget('2026-09', '1'), budget('2026-10', '1')])).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    expect(budgetRangeMonths('all', [])).toEqual(['2026-11'])
  })
})

describe('budgetStatusForRange', () => {
  it('con un solo mes da lo mismo que el estado del mes', () => {
    const [row] = statusFor(
      [budget('2026-11', '100', { carryover: '20', carriedDeficit: '5' })],
      [expense('2026-11-02', '50')],
      ['2026-11']
    )
    expect(row).toMatchObject({ actual: 55, limit: 100, carryover: 20, effectiveLimit: 120 })
  })

  it('suma los meses del rango sin contar dos veces lo que pasa de un mes al otro', () => {
    const [row] = statusFor(
      [
        budget('2026-09', '100', { carryover: '10' }),
        budget('2026-10', '100', { carryover: '60' }),
        budget('2026-11', '100', { carriedDeficit: '30' }),
      ],
      [
        expense('2026-09-10', '50'),
        expense('2026-10-10', '190'),
        expense('2026-11-10', '40'),
        expense('2026-08-10', '999'),
      ],
      ['2026-09', '2026-10', '2026-11']
    )
    expect(row).toMatchObject({
      categoryName: 'Comida',
      actual: 280,
      limit: 300,
      carryover: 10,
      carriedDeficit: 0,
      effectiveLimit: 310,
      isOver: false,
    })
    expect(row.budget.month).toBe('2026-11')
  })

  it('una categoría con presupuestos en monedas distintas da una fila por moneda', () => {
    const rows = statusFor(
      [budget('2026-10', '100'), budget('2026-11', '4000', { id: 'food-ves', currency: 'VES' })],
      [],
      ['2026-10', '2026-11']
    )
    expect(rows.map((r) => r.budget.currency).sort()).toEqual(['USD', 'VES'])
  })

  it('sin presupuestos en el rango no hay filas', () => {
    expect(statusFor([budget('2026-01', '100')], [], ['2026-10', '2026-11'])).toEqual([])
  })
})
