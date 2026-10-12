import { describe, it, expect } from 'vitest'
import { remainderGap, splitMonthRemainder } from '@/lib/wallet/monthClose'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('splitMonthRemainder — por porcentaje', () => {
  it('reparte el sobrante según los porcentajes', () => {
    expect(splitMonthRemainder(100, 'percent', [20, 30, 50])).toEqual([20, 30, 50])
  })

  it('el último tramo absorbe el redondeo y la suma cuadra exacta', () => {
    const parts = splitMonthRemainder(100, 'percent', [33.33, 33.33, 33.34])!
    expect(parts.slice(0, 2)).toEqual([33.33, 33.33])
    expect(sum(parts)).toBe(100)

    const thirds = splitMonthRemainder(10, 'percent', [100 / 3, 100 / 3, 100 / 3])!
    expect(thirds.slice(0, 2)).toEqual([3.33, 3.33])
    expect(thirds[2]).toBeCloseTo(3.34, 10)
    expect(sum(thirds)).toBeCloseTo(10, 10)
  })

  it('un déficit se reparte con signo negativo', () => {
    expect(splitMonthRemainder(-80, 'percent', [25, 75])).toEqual([-20, -60])
  })

  it('rechaza porcentajes que no suman 100', () => {
    expect(splitMonthRemainder(100, 'percent', [20, 30])).toBeNull()
    expect(splitMonthRemainder(100, 'percent', [60, 50])).toBeNull()
  })
})

describe('splitMonthRemainder — por monto fijo', () => {
  it('reparte los montos, que se escriben en positivo', () => {
    expect(splitMonthRemainder(100, 'amount', [20, 80])).toEqual([20, 80])
    expect(splitMonthRemainder(-50, 'amount', [10, 40])).toEqual([-10, -40])
  })

  it('el último absorbe los céntimos que el usuario no puede escribir', () => {
    const remaining = 100 / 3
    const parts = splitMonthRemainder(remaining, 'amount', [10, 23.33])!
    expect(parts[0]).toBe(10)
    expect(sum(parts)).toBe(remaining)
  })

  it('rechaza montos que no suman el total', () => {
    expect(splitMonthRemainder(100, 'amount', [20, 70])).toBeNull()
    expect(splitMonthRemainder(100, 'amount', [20, 90])).toBeNull()
  })
})

describe('splitMonthRemainder — entradas inválidas', () => {
  it('rechaza tramos vacíos, en cero o negativos', () => {
    expect(splitMonthRemainder(100, 'percent', [])).toBeNull()
    expect(splitMonthRemainder(100, 'percent', [0, 100])).toBeNull()
    expect(splitMonthRemainder(100, 'amount', [-20, 120])).toBeNull()
  })

  it('rechaza un reparto cuyo último tramo saldría en cero o con el signo contrario', () => {
    expect(splitMonthRemainder(0.01, 'percent', [50, 49.9999, 0.0001])).toBeNull()
  })

  it('sin sobrante ni déficit no hay nada que repartir', () => {
    expect(splitMonthRemainder(0, 'percent', [100])).toEqual([0])
  })
})

describe('remainderGap', () => {
  it('dice cuánto falta (positivo) o sobra (negativo) en las unidades del modo', () => {
    expect(remainderGap(100, 'percent', [20, 30])).toBe(50)
    expect(remainderGap(100, 'percent', [60, 50])).toBe(-10)
    expect(remainderGap(-80, 'amount', [30])).toBe(50)
    expect(remainderGap(80, 'amount', [30, 50])).toBe(0)
  })
})
