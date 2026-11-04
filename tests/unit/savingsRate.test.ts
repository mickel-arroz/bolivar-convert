import { describe, it, expect } from 'vitest'
import { savingsRateView } from '@/lib/wallet/savingsRate'
import type { PeriodPoint } from '@/hooks/useWallet'
import { EMPTY_STATS_VIEW } from '@/lib/wallet/statsView'

const point = (month: string, income: number, expense: number): PeriodPoint => ({
  period: month,
  label: month,
  income,
  expense,
})

describe('savingsRateView', () => {
  it('la tasa del periodo sale de los totales, no del promedio de cada mes', () => {
    const view = savingsRateView({
      ...EMPTY_STATS_VIEW,
      incomeVsExpense: { income: 1000, expense: 770 },
      periodSeries: [point('2026-10', 1000, 300), point('2026-11', 0, 470)],
    })
    expect(view.overall).toBeCloseTo(0.23)
  })

  it('sin ingresos en el periodo no hay tasa', () => {
    const view = savingsRateView({
      ...EMPTY_STATS_VIEW,
      incomeVsExpense: { income: 0, expense: 50 },
    })
    expect(view.overall).toBeNull()
  })

  it('un mes sin ingresos queda como hueco, no como 0%', () => {
    const view = savingsRateView({
      ...EMPTY_STATS_VIEW,
      periodSeries: [point('2026-09', 100, 80), point('2026-10', 0, 50), point('2026-11', 200, 50)],
    })
    expect(view.series.map((p) => p.rate)).toEqual([20, null, 75])
  })

  it('por debajo de −100% el punto se queda en el piso pero conserva su valor real', () => {
    const view = savingsRateView({
      ...EMPTY_STATS_VIEW,
      periodSeries: [point('2026-10', 10, 1000), point('2026-11', 100, 50)],
    })
    expect(view.series[0]).toMatchObject({ rate: -9900, shown: -100 })
    expect(view.series[1]).toMatchObject({ rate: 50, shown: 50 })
  })

  it('la gráfica aparece en cuanto algún periodo tiene ingresos', () => {
    const none = savingsRateView({
      ...EMPTY_STATS_VIEW,
      periodSeries: [point('2026-10', 0, 5), point('2026-11', 0, 50)],
    })
    expect(none.showLine).toBe(false)

    const one = savingsRateView({
      ...EMPTY_STATS_VIEW,
      periodSeries: [point('2026-10', 0, 5), point('2026-11', 100, 50)],
    })
    expect(one.showLine).toBe(true)
  })

  it('en 1M también hay gráfica, por semanas', () => {
    const view = savingsRateView({
      ...EMPTY_STATS_VIEW,
      periodSeries: [point('2026-10-26', 100, 5), point('2026-11-02', 0, 50)],
    })
    expect(view.showLine).toBe(true)
    expect(view.series.map((p) => p.rate)).toEqual([95, null])
  })
})
