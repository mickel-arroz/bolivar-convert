import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ShoppingListDetailDialog } from '@/components/billetera/ShoppingListDetailDialog'
import { DEFAULT_DISPLAY_CURRENCY } from '@/lib/wallet/displayCurrency'
import type {
  ShoppingList,
  ShoppingListItem,
  UndoPurchasePlan,
  WalletApi,
  WalletState,
} from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = {
  bcvUsd: '40',
  bcvEur: '45',
  binanceUsdAvg: '42',
  lastUpdate: '2026-09-21T00:00:00.000Z',
}

const list: ShoppingList = {
  id: 'list1',
  name: 'Mercado',
  createdAt: '2026-09-01T00:00:00.000Z',
}

const items: ShoppingListItem[] = [
  {
    id: 'it1',
    listId: 'list1',
    title: 'Arroz',
    price: '100',
    currency: 'VES',
    priority: 4,
    purchased: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
]

function walletStub(
  over: Partial<WalletState> = {},
  preview: UndoPurchasePlan = { kind: 'plain' }
): WalletApi {
  const state = {
    shoppingItems: items,
    displayCurrency: DEFAULT_DISPLAY_CURRENCY,
    ...over,
  } as WalletState
  return {
    state,
    undoPurchase: vi.fn(() => ({ kind: 'plain' })),
    previewUndoPurchase: vi.fn(() => preview),
    updateShoppingList: vi.fn(),
  } as unknown as WalletApi
}

function renderDialog(wallet: WalletApi = walletStub()) {
  return render(
    <ShoppingListDetailDialog
      open
      onOpenChange={vi.fn()}
      wallet={wallet}
      list={list}
      rates={RATES}
      onAddItem={vi.fn()}
      onEditList={vi.fn()}
      onPurchase={vi.fn()}
      onOpenItem={vi.fn()}
    />
  )
}

/** El botón de una moneda del selector de Precio total, por su símbolo. */
function currencyButton(symbol: string): HTMLElement {
  return screen.getAllByRole('button').find((b) => b.textContent === symbol)!
}

describe('ShoppingListDetailDialog — moneda del Precio total', () => {
  it('abre con dólares seleccionado', () => {
    renderDialog()

    expect(currencyButton('$')).toHaveClass('bg-background')
    expect(currencyButton('Bs.')).not.toHaveClass('bg-background')
    expect(screen.getByText('en Dólar')).toBeInTheDocument()
  })

  it('el override guardado de la lista gana sobre la preferencia', () => {
    render(
      <ShoppingListDetailDialog
        open
        onOpenChange={vi.fn()}
        wallet={walletStub()}
        list={{ ...list, totalCurrencyOverride: 'EUR' }}
        rates={RATES}
        onAddItem={vi.fn()}
        onEditList={vi.fn()}
        onPurchase={vi.fn()}
        onOpenItem={vi.fn()}
      />
    )

    expect(currencyButton('€')).toHaveClass('bg-background')
  })

  it('guarda un override al elegir otra moneda dentro del modal', () => {
    const wallet = walletStub()
    renderDialog(wallet)

    currencyButton('Bs.').click()

    expect(wallet.updateShoppingList).toHaveBeenCalledWith('list1', {
      totalCurrencyOverride: 'VES',
    })
  })
})

const item = (id: string, title: string, priority: number, purchased: boolean): ShoppingListItem => ({
  id,
  listId: 'list1',
  title,
  price: '10',
  currency: 'VES',
  priority,
  purchased,
  createdAt: '2026-09-01T00:00:00.000Z',
})

describe('ShoppingListDetailDialog — orden de los productos', () => {
  it('los comprados van al final y entre ellos se mantiene el orden por prioridad', () => {
    renderDialog(
      walletStub({
        shoppingItems: [
          item('a', 'Aaa', 1, true),
          item('b', 'Bbb', 4, false),
          item('c', 'Ccc', 2, false),
          item('d', 'Ddd', 3, true),
          item('e', 'Eee', 2, true),
        ],
      })
    )

    const titles = ['Aaa', 'Bbb', 'Ccc', 'Ddd', 'Eee'].map((t) => screen.getByText(t))
    titles.sort((x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))

    // Pendientes por prioridad (Ccc 2, Bbb 4) y luego comprados por prioridad (Aaa 1, Eee 2, Ddd 3).
    expect(titles.map((t) => t.textContent)).toEqual(['Ccc', 'Bbb', 'Aaa', 'Eee', 'Ddd'])
  })
})

describe('ShoppingListDetailDialog — deshacer una compra', () => {
  const purchased = [item('p1', 'Pan', 4, true)]
  const carryover: UndoPurchasePlan = {
    kind: 'carryover',
    budgetId: 'b1',
    amount: 40,
    currency: 'VES',
    categoryName: 'Comida',
    month: '2026-05',
  }
  const TITLE = 'Deshacer una compra de un mes concluido'

  it('si no hay nada que decidir, deshace directo sin preguntar', () => {
    const wallet = walletStub({ shoppingItems: purchased })
    renderDialog(wallet)

    act(() => screen.getByLabelText('Marcar como no comprado').click())

    expect(wallet.undoPurchase).toHaveBeenCalledWith('p1', RATES)
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('en un mes concluido pregunta antes de deshacer, y «Añadir como extra» lo suma', async () => {
    const wallet = walletStub({ shoppingItems: purchased }, carryover)
    renderDialog(wallet)

    act(() => screen.getByLabelText('Marcar como no comprado').click())

    expect(await screen.findByText(TITLE)).toBeInTheDocument()
    expect(wallet.undoPurchase).not.toHaveBeenCalled()

    act(() => screen.getByRole('button', { name: 'Añadir como extra' }).click())

    await waitFor(() => expect(wallet.undoPurchase).toHaveBeenCalledWith('p1', RATES, true))
  })

  it('«Descartar» deshace sin devolver el dinero al presupuesto', async () => {
    const wallet = walletStub({ shoppingItems: purchased }, carryover)
    renderDialog(wallet)

    act(() => screen.getByLabelText('Marcar como no comprado').click())
    await screen.findByText(TITLE)
    act(() => screen.getByRole('button', { name: 'Descartar' }).click())

    await waitFor(() => expect(wallet.undoPurchase).toHaveBeenCalledWith('p1', RATES, false))
  })

  it('«Cancelar» no deshace nada', async () => {
    const wallet = walletStub({ shoppingItems: purchased }, carryover)
    renderDialog(wallet)

    act(() => screen.getByLabelText('Marcar como no comprado').click())
    await screen.findByText(TITLE)
    act(() => screen.getByRole('button', { name: 'Cancelar' }).click())

    await waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument())
    expect(wallet.undoPurchase).not.toHaveBeenCalled()
  })
})
