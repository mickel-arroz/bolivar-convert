import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccountCard } from '@/components/billetera/AccountCard'
import type { Account } from '@/hooks/useWallet'

const account: Account = {
  id: 'acc1',
  name: 'Efectivo',
  currency: 'VES',
  openingBalance: '1000',
  icon: 'wallet',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderCard(available: number, inGoals: number) {
  return render(
    <AccountCard
      account={account}
      available={available}
      inGoals={inGoals}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />
  )
}

describe('AccountCard', () => {
  it('no muestra la línea En metas cuando la cuenta no tiene nada apartado', () => {
    renderCard(1000, 0)

    expect(screen.getByTestId('account-available')).toHaveTextContent('1.000,00')
    expect(screen.queryByTestId('account-in-goals')).not.toBeInTheDocument()
  })

  it('muestra el Disponible en grande y En metas debajo cuando hay algo apartado', () => {
    renderCard(700, 300)

    expect(screen.getByTestId('account-available')).toHaveTextContent('700,00')
    expect(screen.getByTestId('account-in-goals')).toHaveTextContent('300,00')
    expect(screen.getByTestId('account-in-goals')).toHaveTextContent('en metas')
  })
})
