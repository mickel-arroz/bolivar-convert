import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteMovementDialog, DeleteTarget } from '@/components/billetera/DeleteMovementDialog'
import type {
  Account,
  Category,
  ShoppingListItem,
  Transaction,
  Transfer,
  TransactionChangePlan,
  WalletApi,
} from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = {
  bcvUsd: '40',
  bcvEur: '45',
  binanceUsdAvg: '42',
  lastUpdate: '2026-09-21T00:00:00.000Z',
}

const accounts = [
  { id: 'a1', name: 'Efectivo', currency: 'VES', icon: 'wallet', openingBalance: '0' },
  { id: 'a2', name: 'Banco', currency: 'VES', icon: 'wallet', openingBalance: '0' },
] as Account[]
const categories = [
  { id: 'cat_food', name: 'Comida', kind: 'expense', icon: 'food' },
  { id: 'cat_salary', name: 'Salario', kind: 'income', icon: 'salary' },
] as Category[]

const expense: Transaction = {
  id: 't1',
  type: 'expense',
  accountId: 'a1',
  categoryId: 'cat_food',
  amount: '40',
  date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00.000Z',
}
const income: Transaction = { ...expense, id: 't2', type: 'income', categoryId: 'cat_salary' }
const transfer: Transfer = {
  id: 'tr1',
  fromAccountId: 'a1',
  toAccountId: 'a2',
  fromAmount: '50',
  toAmount: '50',
  date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00.000Z',
}
const linkedItem = { id: 'it1', title: 'Pan' } as ShoppingListItem

const NO_PLAN: TransactionChangePlan & { linkedItem?: ShoppingListItem } = {
  corrections: [],
  ratesMissing: false,
}

function walletStub(plan = NO_PLAN, removeOk = true) {
  const removeTransaction = vi.fn(() => (removeOk ? { ok: true } : { ok: false, reason: 'overdraw' }))
  const removeTransfer = vi.fn(() => ({ ok: true }))
  const wallet = {
    state: { accounts, categories, transactions: [expense, income], transfers: [transfer] },
    previewTransactionChange: vi.fn(() => plan),
    removeTransaction,
    removeTransfer,
  } as unknown as WalletApi
  return { wallet, removeTransaction, removeTransfer }
}

function renderDialog(wallet: WalletApi, target: DeleteTarget, onClose = vi.fn()) {
  render(<DeleteMovementDialog target={target} onClose={onClose} wallet={wallet} rates={RATES} />)
  return onClose
}

describe('DeleteMovementDialog', () => {
  it('no pinta nada si no hay nada que eliminar', () => {
    const { wallet } = walletStub()
    renderDialog(wallet, null)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('pide confirmación antes de eliminar un gasto y dice cómo cambia el saldo', async () => {
    const { wallet, removeTransaction } = walletStub()
    renderDialog(wallet, { kind: 'tx', id: 't1' })

    expect(await screen.findByText('Eliminar gasto')).toBeInTheDocument()
    expect(screen.getByText(/El saldo de «Efectivo» sube/)).toBeInTheDocument()
    // Nada se eliminó todavía: primero se confirma.
    expect(removeTransaction).not.toHaveBeenCalled()

    act(() => screen.getByRole('button', { name: 'Eliminar' }).click())
    await waitFor(() => expect(removeTransaction).toHaveBeenCalledWith('t1', { rates: RATES, addExtra: false }))
  })

  it('un ingreso avisa que el saldo baja', async () => {
    const { wallet } = walletStub()
    renderDialog(wallet, { kind: 'tx', id: 't2' })

    expect(await screen.findByText('Eliminar ingreso')).toBeInTheDocument()
    expect(screen.getByText(/El saldo de «Efectivo» baja/)).toBeInTheDocument()
  })

  it('avisa que el producto de una compra vuelve a pendiente', async () => {
    const { wallet } = walletStub({ ...NO_PLAN, linkedItem })
    renderDialog(wallet, { kind: 'tx', id: 't1' })

    expect(await screen.findByText('«Pan»')).toBeInTheDocument()
    expect(screen.getByText(/volverá a/)).toBeInTheDocument()
  })

  it('en un mes concluido ofrece añadir como extra o descartar', async () => {
    const plan = {
      ...NO_PLAN,
      corrections: [
        { budgetId: 'b1', amount: 40, currency: 'VES' as const, categoryName: 'Comida', month: '2026-05' },
      ],
    }
    const { wallet, removeTransaction } = walletStub(plan)
    renderDialog(wallet, { kind: 'tx', id: 't1' })

    await screen.findByText('Eliminar gasto')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Eliminar y añadir extra' }).click())
    await waitFor(() => expect(removeTransaction).toHaveBeenCalledWith('t1', { rates: RATES, addExtra: true }))
  })

  it('cierra el diálogo aunque la eliminación se rechace', async () => {
    const { wallet } = walletStub(NO_PLAN, false)
    const onClose = renderDialog(wallet, { kind: 'tx', id: 't2' })

    await screen.findByText('Eliminar ingreso')
    act(() => screen.getByRole('button', { name: 'Eliminar' }).click())

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('un traspaso también pide confirmación y dice qué cuenta recupera y cuál pierde', async () => {
    const { wallet, removeTransfer } = walletStub()
    renderDialog(wallet, { kind: 'transfer', id: 'tr1' })

    expect(await screen.findByText('Eliminar traspaso')).toBeInTheDocument()
    expect(screen.getByText(/«Efectivo» recupera/)).toBeInTheDocument()
    expect(screen.getByText(/«Banco» pierde/)).toBeInTheDocument()
    expect(removeTransfer).not.toHaveBeenCalled()

    act(() => screen.getByRole('button', { name: 'Eliminar' }).click())
    await waitFor(() => expect(removeTransfer).toHaveBeenCalledWith('tr1'))
  })
})
