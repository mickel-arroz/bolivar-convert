import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GoalDeleteDialog } from '@/components/billetera/GoalDeleteDialog'
import type { Goal, GoalContribution, WalletApi } from '@/hooks/useWallet'

const goal: Goal = { id: 'g1', name: 'Moto', currency: 'USD', createdAt: '2026-09-01T00:00:00.000Z' }

const contribution = (amount: string, accountId?: string): GoalContribution => ({
  id: `c${amount}${accountId ?? ''}`,
  goalId: 'g1',
  accountId,
  amount,
  date: '2026-09-01',
  createdAt: '2026-09-01T00:00:00.000Z',
})

function renderDialog(contributions: GoalContribution[], moveOk = true) {
  const wallet = {
    state: {
      goalContributions: contributions,
      accounts: [
        { id: 'a1', name: 'Zelle', currency: 'USD', openingBalance: '0', icon: 'wallet', createdAt: '' },
        { id: 'a2', name: 'Efectivo', currency: 'USD', openingBalance: '0', icon: 'wallet', createdAt: '' },
      ],
    },
    removeGoal: vi.fn(),
    moveToGoal: vi.fn(() => moveOk),
  } as unknown as WalletApi
  const onOpenChange = vi.fn()
  render(<GoalDeleteDialog goal={goal} onOpenChange={onOpenChange} wallet={wallet} />)
  return { wallet, onOpenChange }
}

describe('GoalDeleteDialog', () => {
  it('dice cuánto vuelve a «Disponible» de cada cuenta', () => {
    renderDialog([contribution('100', 'a1'), contribution('-20', 'a1'), contribution('50', 'a2')])

    expect(screen.getByText('Vuelve a «Disponible»')).toBeInTheDocument()
    expect(screen.getByText('Zelle').nextElementSibling).toHaveTextContent('$ 80.00')
    expect(screen.getByText('Efectivo').nextElementSibling).toHaveTextContent('$ 50.00')
    expect(screen.queryByText(/se perderán/)).not.toBeInTheDocument()
  })

  it('sin dinero sin cuenta, eliminar borra el plan directo', () => {
    const { wallet } = renderDialog([contribution('100', 'a1')])

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(wallet.removeGoal).toHaveBeenCalledWith('g1')
    expect(wallet.moveToGoal).not.toHaveBeenCalled()
  })

  it('avisa del dinero sin cuenta y «Retirar todo y eliminar» lo pasa a la cuenta antes de borrar', () => {
    const { wallet } = renderDialog([contribution('100', 'a1'), contribution('30')])

    expect(screen.getByText(/se perderán/)).toHaveTextContent('$ 30.00')
    fireEvent.click(screen.getByRole('button', { name: 'Retirar todo y eliminar' }))

    expect(wallet.moveToGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: 'g1', accountId: 'a1', amount: '130', direction: 'out' })
    )
    expect(wallet.removeGoal).toHaveBeenCalledWith('g1')
  })

  it('«Eliminar y perder» borra sin retirar', () => {
    const { wallet } = renderDialog([contribution('30')])

    fireEvent.click(screen.getByRole('button', { name: /Eliminar y perder/ }))

    expect(wallet.moveToGoal).not.toHaveBeenCalled()
    expect(wallet.removeGoal).toHaveBeenCalledWith('g1')
  })

  it('si el retiro falla no borra el plan', () => {
    const { wallet } = renderDialog([contribution('30')], false)

    fireEvent.click(screen.getByRole('button', { name: 'Retirar todo y eliminar' }))

    expect(wallet.removeGoal).not.toHaveBeenCalled()
  })
})
