import { describe, it, expect } from 'vitest'
import { budgetStatusForMonth, isBudgetOver } from '@/lib/wallet/compute'
import type { Account, Budget, Category, Transaction } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }
const MONTH = '2026-10'

const account: Account = {
  id: 'acc',
  name: 'Banco',
  currency: 'VES',
  openingBalance: '0',
  icon: 'bank',
  createdAt: '2026-10-01',
}

interface Spec {
  name: string
  limit: number
  carryover?: number
  spent?: number
}

function statusFor(specs: Spec[]) {
  const categories: Category[] = specs.map((s, i) => ({
    id: `cat${i}`,
    name: s.name,
    kind: 'expense',
    icon: 'other',
  }))
  const budgets: Budget[] = specs.map((s, i) => ({
    id: `b${i}`,
    templateId: 'tpl',
    categoryId: `cat${i}`,
    month: MONTH,
    limit: String(s.limit),
    currency: 'VES',
    carryover: s.carryover !== undefined ? String(s.carryover) : undefined,
  }))
  const transactions: Transaction[] = specs
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.spent ?? 0) > 0)
    .map(({ s, i }) => ({
      id: `tx${i}`,
      type: 'expense',
      accountId: 'acc',
      categoryId: `cat${i}`,
      amount: String(s.spent),
      date: `${MONTH}-05`,
      createdAt: `${MONTH}-05`,
    }))
  return budgetStatusForMonth(
    { accounts: [account], categories, budgets, transactions, budgetTransfers: [] },
    RATES,
    'bcvUsd',
    MONTH
  )
}

describe('isBudgetOver', () => {
  it('gasto mayor que el límite efectivo lo sobrepasa', () => {
    expect(isBudgetOver(101, 100)).toBe(true)
  })

  it('gasto exactamente igual al límite no lo sobrepasa', () => {
    expect(isBudgetOver(100, 100)).toBe(false)
  })

  it('con límite efectivo cero, cualquier gasto lo sobrepasa', () => {
    expect(isBudgetOver(0.01, 0)).toBe(true)
  })

  it('con límite efectivo negativo, cualquier gasto lo sobrepasa', () => {
    expect(isBudgetOver(5, -20)).toBe(true)
  })

  it('con límite efectivo ≤ 0 y sin gasto no lo sobrepasa', () => {
    expect(isBudgetOver(0, 0)).toBe(false)
    expect(isBudgetOver(0, -20)).toBe(false)
  })
})

describe('budgetStatusForMonth — estado sobrepasado', () => {
  it('usa límite más arrastre como límite efectivo', () => {
    const [row] = statusFor([{ name: 'Comida', limit: 100, carryover: -100, spent: 10 }])
    expect(row.effectiveLimit).toBe(0)
    expect(row.isOver).toBe(true)
  })

  it('límite 0 sin gasto no está sobrepasado', () => {
    const [row] = statusFor([{ name: 'Comida', limit: 0 }])
    expect(row.isOver).toBe(false)
  })
})

describe('budgetStatusForMonth — orden', () => {
  it('primero los no sobrepasados y luego los sobrepasados, cada grupo de la A a la Z', () => {
    const rows = statusFor([
      { name: 'Transporte', limit: 50, spent: 80 },
      { name: 'zapatos', limit: 100, spent: 10 },
      { name: 'Ocio', limit: 0, spent: 5 },
      { name: 'Ahorro', limit: 0 },
      { name: 'Comida', limit: 100, spent: 100 },
      { name: 'Électricidad', limit: 10, spent: 20 },
    ])

    expect(rows.map((r) => r.categoryName)).toEqual([
      'Ahorro',
      'Comida',
      'zapatos',
      'Électricidad',
      'Ocio',
      'Transporte',
    ])
  })
})
