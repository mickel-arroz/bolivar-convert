import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
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

const feed: FeedItem[] = [
  { kind: 'transfer', id: 'tr1', date: transfer.date, transfer },
  { kind: 'tx', id: 't1', date: tx.date, tx },
]

const funds = vi.hoisted(() => ({
  totalsByCurrency: { VES: 0, USD: 0, EUR: 0 },
  inGoalsByCurrency: { VES: 0, USD: 0, EUR: 0 },
}))
const requested = vi.hoisted(() => ({ urls: [] as string[], totalPages: 1 }))

vi.mock('@/hooks/useWalletResource', () => ({
  useWalletResource: (url: string) => {
    requested.urls.push(url)
    const page = Number(new URL(url, 'http://x').searchParams.get('page') ?? '1')
    return {
      data: url.startsWith('/api/wallet/movements')
        ? { items: feed, page, pageSize: 10, total: 25, totalPages: requested.totalPages }
        : {
            accounts,
            funds: [],
            ...funds,
          },
      loading: false,
      error: false,
    }
  },
}))
vi.mock('@/components/billetera/ResetWallet', () => ({ ResetWallet: () => null }))
vi.mock('@/components/billetera/DeleteMovementDialog', () => ({
  DeleteMovementDialog: ({ target }: { target: DeleteTarget }) =>
    target ? <div data-testid="delete-dialog">{`${target.kind}:${target.id}`}</div> : null,
}))

const originalScrollIntoView = Element.prototype.scrollIntoView

beforeEach(() => {
  requested.urls = []
  requested.totalPages = 1
})

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView
  funds.totalsByCurrency = { VES: 0, USD: 0, EUR: 0 }
  funds.inGoalsByCurrency = { VES: 0, USD: 0, EUR: 0 }
})

function renderTab(stateAccounts: Account[] = accounts) {
  const wallet = {
    state: {
      accounts: stateAccounts,
      transactions: [tx],
      transfers: [transfer],
      categories: [{ id: 'c1', name: 'Comida', kind: 'expense', icon: 'food' }],
      goalContributions: [],
      goals: [],
      shoppingItems: [],
      displayCurrency: 'VES',
      netWorthCurrencyOverride: null,
      statsRateSource: 'bcvUsd',
    },
    syncedVersion: 0,
    removeAccount: vi.fn(),
    setNetWorthCurrency: vi.fn(),
  } as unknown as WalletApi
  const dialogs = {
    openEditTransaction: vi.fn(),
    openNewTransaction: vi.fn(),
    openTransfer: vi.fn(),
    openCategories: vi.fn(),
    openNewAccount: vi.fn(),
  }
  render(<ResumenTab wallet={wallet} rates={RATES} dialogs={dialogs as never} />)
  return { dialogs }
}

describe('ResumenTab — acciones en movimientos', () => {
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

describe('ResumenTab — sección Movimientos', () => {
  it('muestra todo el historial paginado desde la primera página', () => {
    renderTab()

    expect(screen.getByRole('heading', { name: 'Movimientos' })).toBeInTheDocument()
    expect(requested.urls).toContain('/api/wallet/movements?page=1')
    expect(requested.urls.some((u) => u.includes('recent'))).toBe(false)
  })

  it('cambiar de página pide la otra y lleva el scroll al inicio de la sección', () => {
    requested.totalPages = 3
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderTab()
    const section = screen.getByRole('heading', { name: 'Movimientos' }).closest('section')

    fireEvent.click(screen.getByRole('button', { name: /Más antiguos/ }))

    expect(requested.urls).toContain('/api/wallet/movements?page=2')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(section)

    fireEvent.click(screen.getByRole('button', { name: /Recientes/ }))

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('la cabecera tiene Gasto, Ingreso, Traspaso y Categorías', () => {
    const { dialogs } = renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Gasto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ingreso' }))
    fireEvent.click(screen.getByRole('button', { name: 'Traspaso' }))
    fireEvent.click(screen.getByRole('button', { name: 'Categorías' }))

    expect(dialogs.openNewTransaction).toHaveBeenNthCalledWith(1, 'expense')
    expect(dialogs.openNewTransaction).toHaveBeenNthCalledWith(2, 'income')
    expect(dialogs.openTransfer).toHaveBeenCalled()
    expect(dialogs.openCategories).toHaveBeenCalled()
  })

  it('con una sola cuenta no hay traspaso', () => {
    renderTab([accounts[0]])

    expect(screen.getByRole('button', { name: 'Traspaso' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gasto' })).toBeEnabled()
  })

  it('sin cuentas, gasto e ingreso quedan deshabilitados', () => {
    renderTab([])

    expect(screen.getByRole('button', { name: 'Gasto' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ingreso' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Traspaso' })).toBeDisabled()
  })
})

describe('ResumenTab — patrimonio neto', () => {
  it('con dinero en planes muestra también cuánto está disponible', () => {
    funds.totalsByCurrency = { VES: 1000, USD: 0, EUR: 0 }
    funds.inGoalsByCurrency = { VES: 300, USD: 0, EUR: 0 }
    renderTab()

    expect(screen.getByText(/en planes/)).toHaveTextContent('Bs. 300,00')
    expect(screen.getByText(/^Disponible:/)).toHaveTextContent('Bs. 700,00')
  })

  it('solo ofrece Nueva cuenta y la nota vive en un ícono de información', () => {
    const { dialogs } = renderTab()

    expect(screen.queryByRole('button', { name: /Nuevo movimiento/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    expect(dialogs.openNewAccount).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Cómo se calcula el patrimonio/ })).toBeInTheDocument()
    expect(screen.queryByText(/Suma de todas tus cuentas/)).not.toBeInTheDocument()
  })
})
