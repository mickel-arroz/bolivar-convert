import type { StatsView } from './statsView'

export type StatsChartId =
  | 'incomeVsExpense'
  | 'netWorth'
  | 'savingsRate'
  | 'budget'
  | 'expenseByCategory'
  | 'incomeByCategory'
  | 'savingsPlans'
  | 'shoppingLists'

const hasMovements = (s: StatsView) => s.periodSeries.some((p) => p.income > 0 || p.expense > 0)

/** Las gráficas van en una cuadrícula y las listas de barras horizontales en otra. */
export type StatsChartGrid = 'charts' | 'categories'

interface StatsChartDef {
  grid: StatsChartGrid
  /** Sin datos en el rango, la card se oculta. */
  hasData: (stats: StatsView, hasAccounts: boolean) => boolean
}

/** Una entrada por card de Estadísticas, en el orden en que se muestran. */
const STATS_CHARTS: Record<StatsChartId, StatsChartDef> = {
  incomeVsExpense: { grid: 'charts', hasData: hasMovements },
  netWorth: { grid: 'charts', hasData: (s, hasAccounts) => hasAccounts && hasMovements(s) },
  savingsRate: { grid: 'charts', hasData: (s) => s.periodSeries.some((p) => p.income > 0) },
  budget: { grid: 'charts', hasData: (s) => s.budgetRange.length > 0 },
  expenseByCategory: {
    grid: 'categories',
    hasData: (s) => s.categorySummary.some((r) => r.kind === 'expense'),
  },
  incomeByCategory: {
    grid: 'categories',
    hasData: (s) => s.categorySummary.some((r) => r.kind === 'income'),
  },
  savingsPlans: { grid: 'categories', hasData: (s) => s.savingsPlans.rows.length > 0 },
  shoppingLists: { grid: 'categories', hasData: (s) => s.shoppingLists.rows.length > 0 },
}

/** Las cards con datos, en el orden en que se muestran. */
export function visibleStatsCharts(stats: StatsView, hasAccounts: boolean): StatsChartId[] {
  return (Object.keys(STATS_CHARTS) as StatsChartId[]).filter((id) =>
    STATS_CHARTS[id].hasData(stats, hasAccounts)
  )
}

export function statsChartGrid(id: StatsChartId): StatsChartGrid {
  return STATS_CHARTS[id].grid
}
