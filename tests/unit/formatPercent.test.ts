import { describe, it, expect } from 'vitest'
import { formatPercent } from '@/components/billetera/format'

describe('formatPercent', () => {
  it('muestra una proporción como porcentaje entero con el «%» pegado', () => {
    expect(formatPercent(0.25)).toBe('25%')
    expect(formatPercent(0.376)).toBe('38%')
    expect(formatPercent(1.2)).toBe('120%')
    expect(formatPercent(-0.1)).toBe('-10%')
  })

  it('admite decimales con coma, sin ceros de relleno', () => {
    expect(formatPercent(0.125, 2)).toBe('12,5%')
    expect(formatPercent(0.33333, 2)).toBe('33,33%')
    expect(formatPercent(0.4, 2)).toBe('40%')
  })
})
