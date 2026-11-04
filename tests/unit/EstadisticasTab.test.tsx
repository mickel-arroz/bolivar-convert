import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EstadisticasTab } from '@/components/billetera/EstadisticasTab'
import type { CategorySummaryRow, StatsBundle, WalletApi } from '@/hooks/useWallet'

let stats: StatsBundle | undefined
let adviceLoaded = true
vi.mock('@/hooks/useWalletResource', () => ({ useWalletResource: () => ({ data: stats }) }))
vi.mock('@/hooks/useAdvice', () => ({
  useAdvice: () => ({ advice: { stats: '' }, loaded: adviceLoaded }),
}))
vi.mock('@/components/billetera/AdviceCard', () => ({
  AdviceCard: ({ loading }: { loading?: boolean }) => (
    <div data-testid="advice" data-loading={String(!!loading)} />
  ),
}))
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: () => <div data-testid="chart" />,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

const EMPTY: StatsBundle = {
  incomeVsExpense: { income: 0, expense: 0 },
  categorySummary: [],
  monthlySeries: [],
  netWorth: 0,
  netWorthSeries: [],
  budgetStatus: [],
  budgetUsage: { currency: 'VES', spent: 0, total: 0, ratio: 0, onTrack: 0, over: 0 },
  ratesAvailable: true,
}

const expenseRow: CategorySummaryRow = {
  categoryId: 'food',
  name: 'Comida',
  icon: 'food',
  kind: 'expense',
  total: 30,
}

function renderTab(data: StatsBundle, accounts: { id: string }[] = []) {
  stats = data
  const wallet = {
    state: { displayCurrency: 'USD', statsRateSource: 'bcvUsd', timeRange: '1m', accounts },
    setTimeRange: vi.fn(),
    setDisplayCurrency: vi.fn(),
    setStatsRateSource: vi.fn(),
    syncedVersion: 0,
  } as unknown as WalletApi
  return render(<EstadisticasTab wallet={wallet} />)
}

const TITLES = [
  'Ingresos vs Gastos',
  'Patrimonio neto',
  'Tasa de ahorro',
  'Presupuesto vs gastado',
  'Gastos por categoría',
  'Ingresos por categoría',
]
const card = (title: string) => screen.getByText(title).closest('[data-slot="card"]') as HTMLElement

describe('EstadisticasTab — gráficas sin datos', () => {
  it('sin datos oculta todas las gráficas y muestra un solo estado vacío; el resumen sigue', () => {
    renderTab(EMPTY)

    for (const title of TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Registra movimientos para ver tus estadísticas/)).toHaveLength(1)
    expect(screen.queryByText(/No hay datos en este periodo/)).not.toBeInTheDocument()
    expect(screen.getByText('Ingresos')).toBeInTheDocument()
    expect(screen.getByText('Gastos')).toBeInTheDocument()
    expect(screen.getByText('Balance')).toBeInTheDocument()
  })

  it('con solo gastos muestra lo que tiene datos y oculta el resto', () => {
    renderTab({
      ...EMPTY,
      incomeVsExpense: { income: 0, expense: 30 },
      monthlySeries: [{ month: '2026-10', label: 'oct', income: 0, expense: 30 }],
      categorySummary: [expenseRow],
    })

    expect(screen.getByText('Ingresos vs Gastos')).toBeInTheDocument()
    expect(screen.getByText('Gastos por categoría')).toBeInTheDocument()
    expect(screen.queryByText('Tasa de ahorro')).not.toBeInTheDocument()
    expect(screen.queryByText('Patrimonio neto')).not.toBeInTheDocument()
    expect(screen.queryByText('Presupuesto vs gastado')).not.toBeInTheDocument()
    expect(screen.queryByText('Ingresos por categoría')).not.toBeInTheDocument()
    expect(screen.queryByText(/Registra movimientos/)).not.toBeInTheDocument()
  })

  it('con un número impar de cards, la última ocupa toda la fila', () => {
    renderTab(
      {
        ...EMPTY,
        monthlySeries: [{ month: '2026-10', label: 'oct', income: 100, expense: 30 }],
        netWorthSeries: [{ month: '2026-10', label: 'oct', value: 70 }],
        categorySummary: [expenseRow],
      },
      [{ id: 'acc' }]
    )

    expect(card('Ingresos vs Gastos')).not.toHaveClass('lg:col-span-2')
    expect(card('Patrimonio neto')).not.toHaveClass('lg:col-span-2')
    expect(card('Tasa de ahorro')).toHaveClass('lg:col-span-2')
    expect(card('Gastos por categoría')).toHaveClass('md:col-span-2')
  })
})

describe('EstadisticasTab — Consejo mientras cargan las estadísticas', () => {
  it('muestra la card del Consejo con su skeleton junto al resto del skeleton', () => {
    adviceLoaded = false
    try {
      renderTab(undefined as unknown as StatsBundle)
    } finally {
      adviceLoaded = true
    }

    expect(screen.getByTestId('advice')).toHaveAttribute('data-loading', 'true')
  })
})
