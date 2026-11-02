import { describe, it, expect } from 'vitest'
import { toCopyableAmount } from '@/lib/copyAmount'

describe('toCopyableAmount — monto listo para pegar', () => {
  it('quita los puntos de miles y deja la coma decimal (es-VE)', () => {
    expect(toCopyableAmount('6.582.892,00')).toBe('6582892,00')
    expect(toCopyableAmount('12,50')).toBe('12,50')
  })

  it('quita las comas de miles y deja el punto decimal (en-US)', () => {
    expect(toCopyableAmount('1,234,567.89')).toBe('1234567.89')
  })

  it('respeta el signo y quita espacios', () => {
    expect(toCopyableAmount('-1.000,00')).toBe('-1000,00')
    expect(toCopyableAmount(' 2.500,75 ')).toBe('2500,75')
  })

  it('un monto sin decimales solo pierde los separadores de miles', () => {
    expect(toCopyableAmount('1.000.000')).toBe('1000000')
  })
})
