import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ShoppingListsStatsCard } from '@/components/billetera/PlansAndListsStatsCards'

const lists = {
  rows: [{ listId: 'm', name: 'Mercado', pending: 1, remaining: 10, purchased: 0 }],
  remaining: 10,
  purchased: 0,
}

describe('ShoppingListsStatsCard — fuente de la conversión', () => {
  it.each([
    ['bcvUsd', 'Convertido con la tasa BCV'],
    ['binanceUsdAvg', 'Convertido con la tasa Binance'],
  ] as const)('con %s dice con qué tasa convirtió', (source, text) => {
    render(
      <ShoppingListsStatsCard lists={lists} currency="USD" timeRange="1m" rateSource={source} />
    )
    expect(screen.getByText(text)).toBeInTheDocument()
  })
})
