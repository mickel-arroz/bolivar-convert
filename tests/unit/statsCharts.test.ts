import { describe, it, expect } from 'vitest'
import { visibleStatsCharts } from '@/lib/wallet/statsCharts'
import type { BudgetStatusRow, CategorySummaryRow, MonthlyPoint } from '@/hooks/useWallet'
import type { SavingsPlanStat, ShoppingListStat, StatsView } from '@/lib/wallet/statsPlansLists'

const EMPTY: StatsView = {
  incomeVsExpense: { income: 0, expense: 0 },
  categorySummary: [],
  monthlySeries: [],
  netWorth: 0,
  netWorthSeries: [],
  budgetStatus: [],
  budgetUsage: { currency: 'VES', spent: 0, total: 0, ratio: 0, onTrack: 0, over: 0 },
  ratesAvailable: true,
  savingsPlans: { rows: [], progress: null },
  shoppingLists: { rows: [], remaining: 0 },
}

const month = (income: number, expense: number): MonthlyPoint =>
  ({ month: '2026-10', label: 'oct', income, expense })

const category = (kind: 'income' | 'expense'): CategorySummaryRow =>
  ({ categoryId: kind, name: kind, icon: 'other', kind, total: 10 }) as CategorySummaryRow

describe('visibleStatsCharts', () => {
  it('sin datos ni cuentas no muestra ninguna gráfica', () => {
    expect(visibleStatsCharts(EMPTY, false)).toEqual([])
  })

  it('meses sin ingresos ni gastos no cuentan como datos', () => {
    const stats = { ...EMPTY, monthlySeries: [month(0, 0), month(0, 0)] }
    expect(visibleStatsCharts(stats, false)).toEqual([])
  })

  it('con solo gastos muestra Ingresos vs Gastos pero no la tasa de ahorro', () => {
    const stats = { ...EMPTY, monthlySeries: [month(0, 50)] }
    expect(visibleStatsCharts(stats, false)).toEqual(['incomeVsExpense'])
  })

  it('con ingresos en algún mes muestra la tasa de ahorro', () => {
    const stats = { ...EMPTY, monthlySeries: [month(0, 50), month(100, 0)] }
    expect(visibleStatsCharts(stats, false)).toEqual(['incomeVsExpense', 'savingsRate'])
  })

  it('el patrimonio neto se oculta con cuentas pero sin movimientos en el rango', () => {
    const stats = { ...EMPTY, netWorthSeries: [{ month: '2026-10', label: 'oct', value: 70 }] }
    expect(visibleStatsCharts(stats, true)).toEqual([])
  })

  it('el patrimonio neto necesita cuentas y movimientos en el rango', () => {
    const stats = {
      ...EMPTY,
      monthlySeries: [month(0, 50)],
      netWorthSeries: [{ month: '2026-10', label: 'oct', value: 70 }],
    }
    expect(visibleStatsCharts(stats, true)).toEqual(['incomeVsExpense', 'netWorth'])
    expect(visibleStatsCharts(stats, false)).toEqual(['incomeVsExpense'])
  })

  it('el presupuesto vs gastado depende de que haya presupuestos este mes', () => {
    const stats = { ...EMPTY, budgetStatus: [{} as BudgetStatusRow] }
    expect(visibleStatsCharts(stats, false)).toEqual(['budget'])
  })

  it('cada lista por categoría se oculta por separado', () => {
    expect(visibleStatsCharts({ ...EMPTY, categorySummary: [category('expense')] }, false)).toEqual([
      'expenseByCategory',
    ])
    expect(visibleStatsCharts({ ...EMPTY, categorySummary: [category('income')] }, false)).toEqual([
      'incomeByCategory',
    ])
  })

  it('Planes de ahorro se muestra con al menos un plan activo', () => {
    const stats = { ...EMPTY, savingsPlans: { rows: [{} as SavingsPlanStat], progress: null } }
    expect(visibleStatsCharts(stats, false)).toEqual(['savingsPlans'])
  })

  it('Listas de compras se muestra solo con algo por pagar', () => {
    const stats = { ...EMPTY, shoppingLists: { rows: [{} as ShoppingListStat], remaining: 12 } }
    expect(visibleStatsCharts(stats, false)).toEqual(['shoppingLists'])
  })
})
