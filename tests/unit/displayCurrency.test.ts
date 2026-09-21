import { describe, it, expect } from 'vitest'
import {
  DEFAULT_DISPLAY_CURRENCY,
  LEGACY_NETWORTH_CURRENCY_KEY,
  clearLegacyNetWorthCurrency,
  nextOverride,
  readLegacyNetWorthCurrency,
  resolveDisplayCurrency,
} from '@/lib/wallet/displayCurrency'

function storage(initial: Record<string, string>) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    removeItem: (k: string) => void map.delete(k),
    has: (k: string) => map.has(k),
  }
}

describe('DEFAULT_DISPLAY_CURRENCY', () => {
  it('es USD', () => {
    expect(DEFAULT_DISPLAY_CURRENCY).toBe('USD')
  })
})

describe('resolveDisplayCurrency', () => {
  it('usa la preferencia cuando no hay override', () => {
    expect(resolveDisplayCurrency(undefined, 'VES')).toBe('VES')
    expect(resolveDisplayCurrency(null, 'EUR')).toBe('EUR')
  })

  it('el override le gana a la preferencia', () => {
    expect(resolveDisplayCurrency('USD', 'VES')).toBe('USD')
  })

  it('ignora un override que no es una moneda conocida', () => {
    expect(resolveDisplayCurrency('BTC' as never, 'VES')).toBe('VES')
    expect(resolveDisplayCurrency('' as never, 'VES')).toBe('VES')
  })

  it('cae al default de fábrica si la preferencia tampoco es válida', () => {
    expect(resolveDisplayCurrency(undefined, 'BTC' as never)).toBe(DEFAULT_DISPLAY_CURRENCY)
  })
})

describe('readLegacyNetWorthCurrency', () => {
  it('devuelve la moneda guardada en la clave vieja sin borrarla', () => {
    const s = storage({ [LEGACY_NETWORTH_CURRENCY_KEY]: 'EUR' })
    expect(readLegacyNetWorthCurrency(s)).toBe('EUR')
    expect(s.has(LEGACY_NETWORTH_CURRENCY_KEY)).toBe(true)
  })

  it('devuelve null cuando no hay nada guardado', () => {
    expect(readLegacyNetWorthCurrency(storage({}))).toBeNull()
  })

  it('descarta un valor corrupto', () => {
    expect(readLegacyNetWorthCurrency(storage({ [LEGACY_NETWORTH_CURRENCY_KEY]: 'BTC' }))).toBeNull()
  })

  it('no explota si el storage lanza', () => {
    expect(
      readLegacyNetWorthCurrency({
        getItem: () => {
          throw new Error('denied')
        },
      })
    ).toBeNull()
  })
})

describe('clearLegacyNetWorthCurrency', () => {
  it('borra la clave vieja', () => {
    const s = storage({ [LEGACY_NETWORTH_CURRENCY_KEY]: 'EUR' })
    clearLegacyNetWorthCurrency(s)
    expect(s.has(LEGACY_NETWORTH_CURRENCY_KEY)).toBe(false)
  })

  it('no explota si el storage lanza', () => {
    expect(() =>
      clearLegacyNetWorthCurrency({
        removeItem: () => {
          throw new Error('denied')
        },
      })
    ).not.toThrow()
  })
})

describe('nextOverride', () => {
  it('elegir la preferencia borra el override: el bloque vuelve a seguirla', () => {
    expect(nextOverride('USD', 'USD')).toBeUndefined()
  })

  it('elegir otra moneda fija el override', () => {
    expect(nextOverride('VES', 'USD')).toBe('VES')
  })

  it('borrar un override ya existente al volver a la preferencia', () => {
    const preference = 'USD' as const
    const override = nextOverride('VES', preference)
    expect(resolveDisplayCurrency(override, preference)).toBe('VES')
    expect(resolveDisplayCurrency(nextOverride('USD', preference), preference)).toBe('USD')
    expect(nextOverride('USD', preference)).toBeUndefined()
  })
})
