import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccountCard } from '@/components/billetera/AccountCard'
import type { Account } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const account: Account = {
  id: 'acc1',
  name: 'Efectivo',
  currency: 'VES',
  openingBalance: '1000',
  icon: 'wallet',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const RATES: Rates = { bcvUsd: '40', bcvEur: '50', binanceUsdAvg: '80', lastUpdate: '' }

function renderCard(
  available: number,
  inGoals: number,
  over: { account?: Account; rates?: Rates } = {}
) {
  return render(
    <AccountCard
      account={over.account ?? account}
      available={available}
      inGoals={inGoals}
      rates={over.rates}
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

  describe('conversiones', () => {
    it('una cuenta en bolívares muestra dólares y euros BCV y dólares Binance', () => {
      renderCard(4000, 0, { rates: RATES })

      const chips = screen.getByTestId('account-conversions')
      expect(chips).toHaveTextContent('$ 100.00 BCV')
      expect(chips).toHaveTextContent('€ 80.00 BCV')
      expect(chips).toHaveTextContent('$ 50.00 Binance')
    })

    it('una cuenta en dólares muestra bolívares BCV y Binance', () => {
      renderCard(10, 0, { rates: RATES, account: { ...account, currency: 'USD' } })

      const chips = screen.getByTestId('account-conversions')
      expect(chips).toHaveTextContent('Bs. 400,00 BCV')
      expect(chips).toHaveTextContent('Bs. 800,00 Binance')
    })

    it('una cuenta en euros muestra dólares BCV y bolívares con la tasa del euro', () => {
      renderCard(10, 0, { rates: RATES, account: { ...account, currency: 'EUR' } })

      const chips = screen.getByTestId('account-conversions')
      expect(chips).toHaveTextContent('$ 12.50 BCV')
      expect(chips).toHaveTextContent('Bs. 500,00 BCV')
    })

    it('van justo debajo del saldo, antes de la línea En metas', () => {
      renderCard(4000, 300, { rates: RATES })

      const available = screen.getByTestId('account-available')
      const chips = screen.getByTestId('account-conversions')
      const inGoals = screen.getByTestId('account-in-goals')
      const follows = (a: Element, b: Element) =>
        !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      expect(follows(available, chips)).toBe(true)
      expect(follows(chips, inGoals)).toBe(true)
    })

    it('convierten el Disponible, no el saldo total', () => {
      // 700 disponibles de 1000 (300 en metas): se convierten los 700.
      renderCard(700, 300, { rates: RATES })
      expect(screen.getByTestId('account-conversions')).toHaveTextContent('$ 17.50 BCV')
    })

    it('sin tasas la tarjeta se ve como siempre', () => {
      renderCard(1000, 0)
      expect(screen.queryByTestId('account-conversions')).not.toBeInTheDocument()
    })
  })
})
