import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GoalContributionDialog } from '@/components/billetera/GoalContributionDialog'
import { formatMoney as rawFormatMoney } from '@/components/billetera/format'
import type { Account, Goal, GoalContribution, WalletApi } from '@/hooks/useWallet'

/** Como lo lee `toHaveTextContent`, que convierte el espacio de no separación en uno normal. */
const formatMoney = (...args: Parameters<typeof rawFormatMoney>) =>
  rawFormatMoney(...args).replace(/ /g, ' ')

const account = (id: string, name: string): Account => ({
  id,
  name,
  currency: 'USD',
  openingBalance: '500',
  icon: 'wallet',
  createdAt: '2026-01-01T00:00:00.000Z',
})

const plan: Goal = { id: 'p', name: 'Viaje', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' }

const gc = (amount: number, accountId?: string): GoalContribution => ({
  id: `gc-${amount}-${accountId ?? 'none'}`,
  goalId: 'p',
  accountId,
  amount: String(amount),
  date: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
})

function renderDialog(accounts: Account[], contributions: GoalContribution[], goal: Goal = plan) {
  const saved = contributions.reduce((sum, c) => sum + Number(c.amount), 0)
  const wallet = {
    state: { accounts, goalContributions: contributions, goals: [goal], transactions: [], transfers: [] },
    accountFunds: accounts.map((a) => ({
      accountId: a.id,
      currency: 'USD',
      balance: 500,
      inGoals: 0,
      available: 500,
    })),
    goalBalances: [{ goalId: 'p', currency: 'USD', balance: saved }],
    moveToGoal: vi.fn(() => true),
  } as unknown as WalletApi
  render(<GoalContributionDialog open onOpenChange={vi.fn()} wallet={wallet} goal={goal} />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Retirar' })[0])
}

const typeAmount = (value: string) => {
  const input = screen.getByText('Monto').closest('.flex-col')!.querySelector('input')!
  fireEvent.change(input, { target: { value } })
}
const submit = () => screen.getAllByRole('button', { name: 'Retirar' }).at(-1)!

describe('GoalContributionDialog — retirar', () => {
  it('muestra el tope de la cuenta elegida: lo que aportó más lo que llegó sin cuenta', () => {
    renderDialog([account('A', 'Banco')], [gc(100, 'A'), gc(40, 'B'), gc(25)])

    expect(screen.getByTestId('plan-withdrawable')).toHaveTextContent(formatMoney(125, 'USD'))
  })

  it('no deja retirar hacia una cuenta lo que aportó otra', () => {
    renderDialog([account('B', 'Otra')], [gc(100, 'A')])

    typeAmount('50')

    expect(screen.getByTestId('plan-withdrawable')).toHaveTextContent(formatMoney(0, 'USD'))
    expect(screen.getByText(/Supera lo que puedes retirar hacia esta cuenta/)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('avisa qué parte del retiro entra a la cuenta como ingreso', () => {
    renderDialog([account('A', 'Banco')], [gc(100, 'A'), gc(25)])

    typeAmount('110')

    expect(screen.getByText(/entra a la cuenta como ingreso/)).toHaveTextContent(formatMoney(10, 'USD'))
    expect(submit()).toBeEnabled()
  })

  it('un retiro dentro de lo aportado no menciona ningún ingreso', () => {
    renderDialog([account('A', 'Banco')], [gc(100, 'A'), gc(25)])

    typeAmount('80')

    expect(screen.queryByText(/entra a la cuenta como ingreso/)).not.toBeInTheDocument()
  })
})

describe('GoalContributionDialog — restante para la meta', () => {
  it('con meta muestra cuánto falta, justo debajo de lo ahorrado', () => {
    renderDialog([account('A', 'Banco')], [gc(125, 'A')], { ...plan, target: '200' })

    expect(screen.getByTestId('plan-remaining')).toHaveTextContent(formatMoney(75, 'USD'))
  })

  it('con la meta cumplida dice «Meta alcanzada»', () => {
    renderDialog([account('A', 'Banco')], [gc(250, 'A')], { ...plan, target: '200' })

    expect(screen.queryByTestId('plan-remaining')).not.toBeInTheDocument()
    expect(screen.getByText('Meta alcanzada')).toBeInTheDocument()
  })

  it('sin meta no muestra el restante', () => {
    renderDialog([account('A', 'Banco')], [gc(125, 'A')])

    expect(screen.queryByText('Restante para la meta')).not.toBeInTheDocument()
  })
})
