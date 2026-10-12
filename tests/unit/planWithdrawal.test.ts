import { describe, it, expect } from 'vitest'
import { computePlanWithdrawable, splitPlanWithdrawal } from '@/lib/wallet/compute'
import type { GoalContribution } from '@/hooks/useWallet'

let seq = 0
const gc = (goalId: string, amount: number, accountId?: string): GoalContribution => ({
  id: `gc${++seq}`,
  goalId,
  accountId,
  amount: String(amount),
  date: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
})

describe('computePlanWithdrawable', () => {
  it('separa lo que aportó la cuenta de lo que llegó sin cuenta', () => {
    const contributions = [gc('p', 100, 'A'), gc('p', 40, 'B'), gc('p', 25), gc('otro', 999, 'A')]

    expect(computePlanWithdrawable(contributions, 'p', 'A')).toEqual({ fromAccount: 100, unattributed: 25 })
    expect(computePlanWithdrawable(contributions, 'p', 'B')).toEqual({ fromAccount: 40, unattributed: 25 })
  })

  it('una cuenta que no aportó solo puede llevarse lo que llegó sin cuenta', () => {
    expect(computePlanWithdrawable([gc('p', 100, 'A')], 'p', 'B')).toEqual({ fromAccount: 0, unattributed: 0 })
  })

  it('descuenta los retiros ya hechos de cada parte', () => {
    const contributions = [gc('p', 100, 'A'), gc('p', -30, 'A'), gc('p', 50), gc('p', -20)]
    expect(computePlanWithdrawable(contributions, 'p', 'A')).toEqual({ fromAccount: 70, unattributed: 30 })
  })

  it('nunca devuelve una parte negativa, aunque los datos viejos la tengan', () => {
    expect(computePlanWithdrawable([gc('p', 100, 'A'), gc('p', -100, 'B')], 'p', 'B')).toEqual({
      fromAccount: 0,
      unattributed: 0,
    })
  })
})

describe('splitPlanWithdrawal', () => {
  it('saca primero lo que aportó la cuenta', () => {
    expect(splitPlanWithdrawal({ fromAccount: 100, unattributed: 50 }, 80)).toEqual({
      fromAccount: 80,
      unattributed: 0,
    })
  })

  it('lo que pasa de lo aportado sale del dinero sin cuenta', () => {
    expect(splitPlanWithdrawal({ fromAccount: 100, unattributed: 50 }, 130)).toEqual({
      fromAccount: 100,
      unattributed: 30,
    })
  })

  it('acepta retirar justo el tope', () => {
    expect(splitPlanWithdrawal({ fromAccount: 100, unattributed: 50 }, 150)).toEqual({
      fromAccount: 100,
      unattributed: 50,
    })
  })

  it('un residuo de coma flotante no se convierte en ingreso', () => {
    const fromAccount = 0.7 - 0.4
    expect(splitPlanWithdrawal({ fromAccount, unattributed: 0 }, 0.3)).toEqual({
      fromAccount: 0.3,
      unattributed: 0,
    })
  })

  it('devuelve null si el monto pasa del tope', () => {
    expect(splitPlanWithdrawal({ fromAccount: 100, unattributed: 50 }, 150.01)).toBeNull()
  })
})
