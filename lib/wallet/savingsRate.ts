import type { StatsBundle } from '@/hooks/useWallet'

/** Por debajo de esto el punto se queda en el borde del eje; el tooltip da el valor real. */
export const SAVINGS_RATE_FLOOR = -100

export interface SavingsRatePoint {
  label: string
  /** % ahorrado del periodo; `null` si no hubo ingresos (hueco en la línea). */
  rate: number | null
  /** `rate` con piso en `SAVINGS_RATE_FLOOR`, para dibujarlo. */
  shown: number | null
}

export interface SavingsRateView {
  /** Fracción ahorrada del rango completo: (ingresos − gastos) / ingresos. `null` sin ingresos. */
  overall: number | null
  /** Por mes o trimestre; vacía cuando la serie va por semanas. */
  series: SavingsRatePoint[]
  /** Hay al menos 2 periodos con ingresos: una línea tiene algo que contar. */
  showLine: boolean
}

export function savingsRateView(
  stats: Pick<StatsBundle, 'incomeVsExpense' | 'monthlySeries' | 'seriesGranularity'>
): SavingsRateView {
  const { income, expense } = stats.incomeVsExpense
  const overall = income > 0 ? (income - expense) / income : null

  if (stats.seriesGranularity === 'week') return { overall, series: [], showLine: false }

  const series = stats.monthlySeries.map((p): SavingsRatePoint => {
    const rate = p.income > 0 ? Math.round(((p.income - p.expense) / p.income) * 100) : null
    return {
      label: p.label,
      rate,
      shown: rate === null ? null : Math.max(rate, SAVINGS_RATE_FLOOR),
    }
  })
  const withIncome = series.filter((p) => p.rate !== null).length
  return { overall, series, showLine: withIncome >= 2 }
}
