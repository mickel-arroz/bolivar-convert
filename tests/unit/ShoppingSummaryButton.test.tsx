import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ShoppingSummaryButton } from '@/components/billetera/ShoppingSummaryButton'
import type { ShoppingList, ShoppingListItem } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = {
  bcvUsd: '50',
  bcvEur: '60',
  binanceUsdAvg: '55',
  lastUpdate: '2026-09-21T00:00:00.000Z',
}

const NO_USD_RATE: Rates = { ...RATES, bcvUsd: '0' }

const lists: ShoppingList[] = [
  { id: 'l1', name: 'Mercado', createdAt: '2026-09-01T00:00:00.000Z' },
  { id: 'l2', name: 'Ferretería', createdAt: '2026-09-01T00:00:00.000Z' },
]

function item(over: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: Math.random().toString(36).slice(2),
    listId: 'l1',
    title: 'Producto',
    price: '100',
    currency: 'VES',
    priority: 4,
    purchased: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  }
}

function renderButton(items: ShoppingListItem[], rates = RATES, listsArg = lists) {
  return render(
    <ShoppingSummaryButton
      lists={listsArg}
      items={items}
      rates={rates}
      preferredCurrency="VES"
    />
  )
}

function openSummary() {
  fireEvent.click(screen.getByRole('button', { name: /Resumen/ }))
}

describe('ShoppingSummaryButton — condición del botón', () => {
  it('no aparece cuando no hay ninguna lista', () => {
    const { container } = renderButton([], RATES, [])
    expect(container).toBeEmptyDOMElement()
  })

  it('no aparece cuando todas las listas están vacías', () => {
    const { container } = renderButton([])
    expect(container).toBeEmptyDOMElement()
  })

  it('aparece cuando hay al menos un producto', () => {
    renderButton([item()])
    expect(screen.getByRole('button', { name: /Resumen/ })).toBeInTheDocument()
  })

  it('sigue apareciendo cuando todos los productos ya están comprados', () => {
    renderButton([item({ purchased: true }), item({ listId: 'l2', purchased: true })])
    expect(screen.getByRole('button', { name: /Resumen/ })).toBeInTheDocument()
  })
})

describe('ShoppingSummaryButton — resumen', () => {
  it('muestra una fila por lista con sus conteos y su Precio total', () => {
    renderButton([
      item({ listId: 'l1', price: '300', purchased: true }),
      item({ listId: 'l1', price: '200' }),
      item({ listId: 'l2', price: '500' }),
    ])
    openSummary()

    const rows = screen.getAllByTestId('summary-list-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Mercado')
    expect(rows[0]).toHaveTextContent('1 comprados · 1 por comprar')
    expect(rows[0]).toHaveTextContent('500,00')
    expect(rows[1]).toHaveTextContent('Ferretería')
    expect(rows[1]).toHaveTextContent('0 comprados · 1 por comprar')
  })

  it('muestra el Precio total de todas las listas y el Restante total por pagar', () => {
    renderButton([
      item({ listId: 'l1', price: '300', purchased: true }),
      item({ listId: 'l2', price: '200' }),
    ])
    openSummary()

    expect(screen.getByTestId('summary-total')).toHaveTextContent('500,00')
    expect(screen.getByTestId('summary-remaining')).toHaveTextContent('200,00')
  })

  it('avisa que el total está incompleto cuando falta una tasa', () => {
    renderButton([item({ listId: 'l1', price: '10', currency: 'USD' })], NO_USD_RATE)
    openSummary()

    expect(screen.getByTestId('summary-total')).toHaveTextContent('—')
    expect(screen.getByText(/el total está incompleto/)).toBeInTheDocument()
    // Los conteos siguen siendo legibles aunque falte la tasa.
    expect(screen.getByTestId('summary-list-row')).toHaveTextContent('0 comprados · 1 por comprar')
  })

  it('muestra el desglose por prioridad del total global', () => {
    renderButton([
      item({ listId: 'l1', priority: 1, price: '500' }),
      item({ listId: 'l2', priority: 3, price: '300' }),
    ])
    openSummary()
    fireEvent.click(screen.getByText('Por prioridad'))

    const cards = screen.getAllByTestId('priority-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Alta')
    expect(cards[1]).toHaveTextContent('Baja')
    expect(screen.queryByText('Media')).not.toBeInTheDocument()
  })
})
