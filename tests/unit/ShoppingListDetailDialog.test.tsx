import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ShoppingListDetailDialog } from '@/components/billetera/ShoppingListDetailDialog'
import { DEFAULT_DISPLAY_CURRENCY } from '@/lib/wallet/displayCurrency'
import type { ShoppingList, ShoppingListItem, WalletApi, WalletState } from '@/hooks/useWallet'
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

function walletStub(over: Partial<WalletState> = {}): WalletApi {
  const state = {
    shoppingItems: items,
    displayCurrency: DEFAULT_DISPLAY_CURRENCY,
    ...over,
  } as WalletState
  return {
    state,
    undoPurchase: vi.fn(),
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
