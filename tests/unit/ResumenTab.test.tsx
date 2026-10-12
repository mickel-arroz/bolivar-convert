import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResumenTab } from '@/components/billetera/ResumenTab'
import type { Account, Transaction, Transfer, WalletApi } from '@/hooks/useWallet'
import type { FeedItem } from '@/lib/wallet/compute'
import type { Rates } from '@/constants/rates'
import type { DeleteTarget } from '@/components/billetera/DeleteMovementDialog'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }

const accounts = [
  { id: 'a1', name: 'Banco', currency: 'VES', icon: 'bank' },
  { id: 'a2', name: 'Efectivo', currency: 'VES', icon: 'cash' },
] as unknown as Account[]

const tx = {
  id: 't1',
  type: 'expense',
  accountId: 'a1',
  categoryId: 'c1',
  amount: '10',
  date: '2026-10-01',
  description: '',
} as unknown as Transaction

const transfer = {
  id: 'tr1',
  fromAccountId: 'a1',
  toAccountId: 'a2',
  amount: '5',
  date: '2026-10-02',
} as unknown as Transfer

const recent: FeedItem[] = [
  { kind: 'transfer', id: 'tr1', date: transfer.date, transfer },
  { kind: 'tx', id: 't1', date: tx.date, tx },
]

vi.mock('@/hooks/useWalletResource', () => ({
  useWalletResource: (url: string) => ({
    data: url.includes('recent')
      ? { items: recent }
      : {
          accounts,
          funds: [],
          totalsByCurrency: { VES: 0, USD: 0, EUR: 0 },
          inGoalsByCurrency: { VES: 0, USD: 0, EUR: 0 },
        },
    loading: false,
    error: false,
  }),
}))
vi.mock('@/components/billetera/ResetWallet', () => ({ ResetWallet: () => null }))
vi.mock('@/components/billetera/DeleteMovementDialog', () => ({
  DeleteMovementDialog: ({ target }: { target: DeleteTarget }) =>
    target ? <div data-testid="delete-dialog">{`${target.kind}:${target.id}`}</div> : null,
}))

function renderTab() {
  const wallet = {
    state: {
      accounts,
      transactions: [tx],
      transfers: [transfer],
      categories: [{ id: 'c1', name: 'Comida', kind: 'expense', icon: 'food' }],
      goalContributions: [],
      shoppingItems: [],
      displayCurrency: 'VES',
      netWorthCurrencyOverride: null,
      statsRateSource: 'bcvUsd',
    },
    syncedVersion: 0,
    removeAccount: vi.fn(),
    setNetWorthCurrency: vi.fn(),
  } as unknown as WalletApi
  const dialogs = { openEditTransaction: vi.fn() }
  render(<ResumenTab wallet={wallet} rates={RATES} dialogs={dialogs as never} />)
  return { dialogs }
}

describe('ResumenTab — acciones en movimientos recientes', () => {
  it('cada transacción tiene editar y eliminar; cada traspaso, eliminar', () => {
    renderTab()

    expect(screen.getAllByRole('button', { name: 'Editar movimiento' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Eliminar movimiento' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Eliminar traspaso' })).toHaveLength(1)
  })

  it('editar abre el mismo modal de edición con la transacción', () => {
    const { dialogs } = renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Editar movimiento' }))

    expect(dialogs.openEditTransaction).toHaveBeenCalledWith(tx)
  })

  it('eliminar una transacción pide la confirmación de borrado', () => {
    renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar movimiento' }))

    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('tx:t1')
  })

  it('eliminar un traspaso pide la confirmación de borrado', () => {
    renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar traspaso' }))

    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('transfer:tr1')
  })
})
