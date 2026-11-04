import type { StatsBundle } from '@/hooks/useWallet'

export type StatsChartId =
  | 'incomeVsExpense'
  | 'netWorth'
  | 'savingsRate'
  | 'budget'
  | 'expenseByCategory'
  | 'incomeByCategory'

const hasMovements = (s: StatsBundle) => s.monthlySeries.some((p) => p.income > 0 || p.expense > 0)

/** Las gráficas van en una cuadrícula y las listas por categoría en otra. */
export type StatsChartGrid = 'charts' | 'categories'

interface StatsChartDef {
  grid: StatsChartGrid
  /** Sin datos en el rango, la card se oculta. */
  hasData: (stats: StatsBundle, hasAccounts: boolean) => boolean
}

/** Una entrada por card de Estadísticas, en el orden en que se muestran. */
const STATS_CHARTS: Record<StatsChartId, StatsChartDef> = {
  incomeVsExpense: { grid: 'charts', hasData: hasMovements },
  netWorth: { grid: 'charts', hasData: (s, hasAccounts) => hasAccounts && hasMovements(s) },
  savingsRate: { grid: 'charts', hasData: (s) => s.monthlySeries.some((p) => p.income > 0) },
  budget: { grid: 'charts', hasData: (s) => s.budgetStatus.length > 0 },
  expenseByCategory: {
    grid: 'categories',
    hasData: (s) => s.categorySummary.some((r) => r.kind === 'expense'),
  },
  incomeByCategory: {
    grid: 'categories',
    hasData: (s) => s.categorySummary.some((r) => r.kind === 'income'),
  },
}

/** Las cards con datos, en el orden en que se muestran. */
export function visibleStatsCharts(stats: StatsBundle, hasAccounts: boolean): StatsChartId[] {
  return (Object.keys(STATS_CHARTS) as StatsChartId[]).filter((id) =>
    STATS_CHARTS[id].hasData(stats, hasAccounts)
  )
}

export function statsChartGrid(id: StatsChartId): StatsChartGrid {
  return STATS_CHARTS[id].grid
}
