import { describe, it, expect } from 'vitest'
import { accountConversions } from '@/lib/wallet/accountConversions'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '50', binanceUsdAvg: '80', lastUpdate: '' }

describe('accountConversions', () => {
  it('una cuenta en bolívares se convierte a dólares y euros con BCV, y a dólares con Binance', () => {
    expect(accountConversions(4000, 'VES', RATES)).toEqual([
      { currency: 'USD', source: 'BCV', value: 100 },
      { currency: 'EUR', source: 'BCV', value: 80 },
      { currency: 'USD', source: 'Binance', value: 50 },
    ])
  })

  it('una cuenta en dólares se convierte a bolívares con BCV y con Binance', () => {
    expect(accountConversions(10, 'USD', RATES)).toEqual([
      { currency: 'VES', source: 'BCV', value: 400 },
      { currency: 'VES', source: 'Binance', value: 800 },
    ])
  })

  it('una cuenta en euros se convierte a dólares BCV y a bolívares con la tasa del euro', () => {
    expect(accountConversions(10, 'EUR', RATES)).toEqual([
      { currency: 'USD', source: 'BCV', value: 12.5 }, // 10 € × 50 / 40
      { currency: 'VES', source: 'BCV', value: 500 },
    ])
  })

  it('un saldo negativo se convierte con su signo', () => {
    expect(accountConversions(-40, 'VES', RATES)[0].value).toBe(-1)
  })

  it('una conversión cuya tasa falta se omite en vez de mostrarse en cero', () => {
    const sinBinance = { ...RATES, binanceUsdAvg: '' }
    expect(accountConversions(4000, 'VES', sinBinance).map((c) => c.source)).toEqual(['BCV', 'BCV'])
    expect(accountConversions(10, 'USD', sinBinance).map((c) => c.source)).toEqual(['BCV'])

    const sinEuro = { ...RATES, bcvEur: '0' }
    expect(accountConversions(4000, 'VES', sinEuro).map((c) => c.currency)).toEqual(['USD', 'USD'])
    expect(accountConversions(10, 'EUR', sinEuro)).toEqual([])
  })

  it('sin ninguna tasa no ofrece nada', () => {
    const none: Rates = { bcvUsd: '', bcvEur: '', binanceUsdAvg: '', lastUpdate: '' }
    for (const c of ['VES', 'USD', 'EUR'] as const) {
      expect(accountConversions(100, c, none)).toEqual([])
    }
  })
})
