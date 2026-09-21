import { describe, it, expect } from 'vitest'
import {
  computeAccountFunds,
  computeInGoalsByCurrency,
  computeTotalsByCurrency,
} from '@/lib/wallet/compute'
import type {
  Account,
  Budget,
  GoalContribution,
  Transaction,
  Transfer,
} from '@/hooks/useWallet'

function account(over: Partial<Account> = {}): Account {
  return {
    id: 'acc1',
    name: 'Cuenta',
    currency: 'VES',
    openingBalance: '1000',
    icon: 'wallet',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    type: 'expense',
    accountId: 'acc1',
    categoryId: 'cat_food',
    amount: '100',
    date: '2026-01-02',
    createdAt: '2026-01-02T00:00:00.000Z',
    ...over,
  }
}

function contribution(over: Partial<GoalContribution> = {}): GoalContribution {
  return {
    id: 'gc1',
    goalId: 'goal1',
    accountId: 'acc1',
    amount: '300',
    date: '2026-01-03',
    createdAt: '2026-01-03T00:00:00.000Z',
    ...over,
  }
}

function funds(
  accounts: Account[],
  goalContributions: GoalContribution[] = [],
  transactions: Transaction[] = [],
  transfers: Transfer[] = []
) {
  return computeAccountFunds({ accounts, transactions, transfers, goalContributions })
}

describe('computeAccountFunds', () => {
  it('sin aportes, el Disponible es el Saldo de la cuenta y En metas es cero', () => {
    const [f] = funds([account()], [], [tx({ amount: '250' })])

    expect(f.balance).toBe(750)
    expect(f.inGoals).toBe(0)
    expect(f.available).toBe(750)
  })

  it('aportar a una meta baja el Disponible y sube En metas, sin mover el Saldo de la cuenta', () => {
    const before = funds([account()])[0]
    const after = funds([account()], [contribution({ amount: '300' })])[0]

    expect(after.balance).toBe(before.balance)
    expect(after.available).toBe(before.available - 300)
    expect(after.inGoals).toBe(before.inGoals + 300)
  })

  it('retirar de una meta sube el Disponible y baja En metas', () => {
    const [f] = funds([account()], [
      contribution({ id: 'gc1', amount: '300' }),
      contribution({ id: 'gc2', amount: '-120' }),
    ])

    expect(f.balance).toBe(1000)
    expect(f.inGoals).toBe(180)
    expect(f.available).toBe(820)
  })

  it('el Saldo de la cuenta siempre es Disponible más En metas', () => {
    const rows = funds(
      [account({ id: 'acc1' }), account({ id: 'acc2', openingBalance: '500' })],
      [
        contribution({ id: 'gc1', accountId: 'acc1', amount: '300' }),
        contribution({ id: 'gc2', accountId: 'acc2', amount: '-50' }),
      ],
      [tx({ accountId: 'acc1', amount: '75' }), tx({ id: 'tx2', accountId: 'acc2', type: 'income', amount: '40' })]
    )

    for (const f of rows) {
      expect(f.balance).toBeCloseTo(f.available + f.inGoals, 10)
    }
  })

  it('un aporte sin cuenta no altera ninguna cuenta', () => {
    const rows = funds([account()], [contribution({ accountId: undefined, amount: '400' })])

    expect(rows[0].balance).toBe(1000)
    expect(rows[0].inGoals).toBe(0)
    expect(rows[0].available).toBe(1000)
  })

  it('con un aporte sin cuenta, la suma de En metas queda por debajo del saldo de la meta', () => {
    const contributions = [
      contribution({ id: 'gc1', accountId: 'acc1', amount: '300' }),
      contribution({ id: 'gc2', accountId: undefined, amount: '400' }),
    ]
    const rows = funds([account()], contributions)

    const inGoalsTotal = rows.reduce((sum, f) => sum + f.inGoals, 0)
    const goalBalance = contributions.reduce((sum, c) => sum + Number(c.amount), 0)

    expect(inGoalsTotal).toBe(300)
    expect(goalBalance).toBe(700)
    expect(inGoalsTotal).toBeLessThan(goalBalance)
  })

  it('un presupuesto no altera ninguna de las tres cifras', () => {
    // Los presupuestos se indexan por categoría y mes: no debitan ni reservan saldo.
    const budget: Budget = {
      id: 'b1',
      templateId: 'tpl_default',
      categoryId: 'cat_food',
      month: '2026-01',
      limit: '900',
      currency: 'VES',
    }
    expect(budget.limit).toBe('900')

    const [f] = funds([account()], [contribution({ amount: '300' })])
    expect(f.balance).toBe(1000)
    expect(f.inGoals).toBe(300)
    expect(f.available).toBe(700)
  })

  it('un traspaso mueve el Saldo de la cuenta y deja En metas intacto', () => {
    const transfer: Transfer = {
      id: 'tr1',
      fromAccountId: 'acc1',
      toAccountId: 'acc2',
      fromAmount: '200',
      toAmount: '200',
      date: '2026-01-04',
      createdAt: '2026-01-04T00:00:00.000Z',
    }
    const rows = funds(
      [account({ id: 'acc1' }), account({ id: 'acc2', openingBalance: '0' })],
      [contribution({ accountId: 'acc1', amount: '300' })],
      [],
      [transfer]
    )

    expect(rows[0].balance).toBe(800)
    expect(rows[0].inGoals).toBe(300)
    expect(rows[0].available).toBe(500)
    expect(rows[1].balance).toBe(200)
  })
})

describe('totales por moneda', () => {
  it('el patrimonio neto incluye el dinero que está en metas', () => {
    const rows = funds([account()], [contribution({ amount: '300' })])

    expect(computeTotalsByCurrency(rows).VES).toBe(1000)
  })

  it('En metas por moneda solo cuenta lo apartado desde cuentas', () => {
    const rows = funds(
      [account({ id: 'acc1' }), account({ id: 'acc2', currency: 'USD', openingBalance: '50' })],
      [
        contribution({ id: 'gc1', accountId: 'acc1', amount: '300' }),
        contribution({ id: 'gc2', accountId: 'acc2', amount: '20' }),
        contribution({ id: 'gc3', accountId: undefined, amount: '400' }),
      ]
    )

    expect(computeInGoalsByCurrency(rows)).toEqual({ VES: 300, USD: 20, EUR: 0 })
  })
})
