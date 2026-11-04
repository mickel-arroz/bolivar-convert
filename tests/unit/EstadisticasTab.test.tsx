import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EstadisticasTab } from '@/components/billetera/EstadisticasTab'
import type { CategorySummaryRow, WalletApi } from '@/hooks/useWallet'
import { EMPTY_STATS_VIEW, type StatsView } from '@/lib/wallet/statsPlansLists'

let stats: StatsView | undefined
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

const EMPTY = EMPTY_STATS_VIEW

const expenseRow: CategorySummaryRow = {
  categoryId: 'food',
  name: 'Comida',
  icon: 'food',
  kind: 'expense',
  total: 30,
}

function renderTab(data: StatsView | undefined, accounts: { id: string }[] = []) {
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
  'Planes de ahorro',
  'Listas de compras',
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

describe('EstadisticasTab — Planes de ahorro y Listas de compras', () => {
  it('resume el progreso hacia las Metas y detalla cada plan', () => {
    renderTab({
      ...EMPTY,
      savingsPlans: {
        rows: [
          { goalId: 'viaje', name: 'Viaje', currency: 'USD', saved: 150, target: 500 },
          { goalId: 'moto', name: 'Moto', currency: 'USD', saved: 200, target: 200 },
          { goalId: 'colchon', name: 'Colchón', currency: 'VES', saved: 30, target: null },
        ],
        progress: { saved: 350, target: 700, reached: 1, withTarget: 2 },
      },
    })

    const plans = card('Planes de ahorro')
    expect(plans).toHaveTextContent('50%')
    expect(plans).toHaveTextContent('$ 350.00 de $ 700.00')
    expect(plans).toHaveTextContent('1 de 2 Metas alcanzadas')

    const [viaje, moto, colchon] = within(plans).getAllByTestId('stats-plan-row')
    expect(viaje).toHaveTextContent('$ 150.00 de $ 500.00')
    expect(viaje).toHaveTextContent('30%')
    expect(moto).toHaveTextContent('Meta alcanzada')
    expect(colchon).toHaveTextContent('Sin Meta')
    expect(colchon).toHaveTextContent('Bs. 30,00')
    expect(screen.queryByText(/Registra movimientos/)).not.toBeInTheDocument()
  })

  it('sin planes con Meta no muestra el anillo de progreso', () => {
    renderTab({
      ...EMPTY,
      savingsPlans: {
        rows: [{ goalId: 'colchon', name: 'Colchón', currency: 'VES', saved: 30, target: null }],
        progress: null,
      },
    })

    expect(card('Planes de ahorro')).not.toHaveTextContent('Metas alcanzadas')
  })

  it('resume el Restante total por pagar y detalla cada lista con su peso', () => {
    renderTab({
      ...EMPTY,
      shoppingLists: {
        rows: [
          { listId: 'mercado', name: 'Mercado', pending: 2, remaining: 75 },
          { listId: 'casa', name: 'Casa', pending: 1, remaining: 25 },
        ],
        remaining: 100,
      },
    })

    const lists = card('Listas de compras')
    expect(lists).toHaveTextContent('Restante total por pagar')
    expect(lists).toHaveTextContent('$ 100.00')
    expect(lists).toHaveTextContent('3 productos en 2 listas')

    const [mercado, casa] = within(lists).getAllByTestId('stats-list-row')
    expect(mercado).toHaveTextContent('Mercado')
    expect(mercado).toHaveTextContent('2 por comprar')
    expect(mercado).toHaveTextContent('$ 75.00')
    expect(mercado).toHaveTextContent('75%')
    expect(casa).toHaveTextContent('1 por comprar')
    expect(casa).toHaveTextContent('25%')
  })

  it('con muchos elementos la lista hace scroll en vez de alargar la card', () => {
    renderTab({
      ...EMPTY,
      savingsPlans: {
        rows: Array.from({ length: 20 }, (_, i) => ({
          goalId: `p${i}`,
          name: `Plan ${i}`,
          currency: 'USD' as const,
          saved: i,
          target: null,
        })),
        progress: null,
      },
      shoppingLists: {
        rows: Array.from({ length: 20 }, (_, i) => ({
          listId: `l${i}`,
          name: `Lista ${i}`,
          pending: 1,
          remaining: i + 1,
        })),
        remaining: 210,
      },
    })

    for (const title of ['Planes de ahorro', 'Listas de compras']) {
      const scroller = within(card(title)).getByTestId('stats-scroll')
      expect(scroller).toHaveClass('overflow-y-auto')
      expect(scroller.className).toMatch(/max-h-/)
    }
  })

  it('sin planes ni nada por pagar no muestra ninguna de las dos', () => {
    renderTab(EMPTY)

    expect(screen.queryByText('Planes de ahorro')).not.toBeInTheDocument()
    expect(screen.queryByText('Listas de compras')).not.toBeInTheDocument()
    expect(screen.getByText(/Registra movimientos/)).toBeInTheDocument()
  })
})

describe('EstadisticasTab — Consejo mientras cargan las estadísticas', () => {
  it('muestra la card del Consejo con su skeleton junto al resto del skeleton', () => {
    adviceLoaded = false
    try {
      renderTab(undefined)
    } finally {
      adviceLoaded = true
    }

    expect(screen.getByTestId('advice')).toHaveAttribute('data-loading', 'true')
  })
})

describe('EstadisticasTab — Gastos e Ingresos por categoría', () => {
  const categoryRow = (
    id: string,
    kind: 'income' | 'expense',
    total: number
  ): CategorySummaryRow => ({
    categoryId: id,
    name: id,
    icon: 'other',
    kind,
    total,
  })

  it('resume el total y detalla cada categoría con su peso', () => {
    renderTab({
      ...EMPTY,
      categorySummary: [
        categoryRow('Comida', 'expense', 75),
        categoryRow('Transporte', 'expense', 25),
        categoryRow('Sueldo', 'income', 500),
      ],
    })

    const gastos = card('Gastos por categoría')
    expect(gastos).toHaveTextContent('$ 100.00')
    expect(gastos).toHaveTextContent('2 categorías')
    const [comida, transporte] = within(gastos).getAllByTestId('stats-category-row')
    expect(comida).toHaveTextContent('Comida')
    expect(comida).toHaveTextContent('$ 75.00')
    expect(comida).toHaveTextContent('75%')
    expect(transporte).toHaveTextContent('25%')

    const ingresos = card('Ingresos por categoría')
    expect(ingresos).toHaveTextContent('$ 500.00')
    expect(ingresos).toHaveTextContent('1 categoría')
    expect(within(ingresos).getAllByTestId('stats-category-row')).toHaveLength(1)
  })

  it('con muchas categorías la lista hace scroll en vez de alargar la card', () => {
    renderTab({
      ...EMPTY,
      categorySummary: Array.from({ length: 25 }, (_, i) => categoryRow(`C${i}`, 'expense', i + 1)),
    })

    const scroller = within(card('Gastos por categoría')).getByTestId('stats-scroll')
    expect(scroller).toHaveClass('overflow-y-auto')
    expect(scroller.className).toMatch(/max-h-/)
  })
})

describe('EstadisticasTab — porcentaje al pasar sobre las barras', () => {
  it('cada tramo dice a qué elemento pertenece y qué porcentaje es', () => {
    renderTab({
      ...EMPTY,
      categorySummary: [
        { categoryId: 'c', name: 'Comida', icon: 'other', kind: 'expense', total: 75 },
        { categoryId: 't', name: 'Transporte', icon: 'other', kind: 'expense', total: 25 },
      ],
      savingsPlans: {
        rows: [{ goalId: 'v', name: 'Viaje', currency: 'USD', saved: 150, target: 500 }],
        progress: null,
      },
      shoppingLists: {
        rows: [
          { listId: 'm', name: 'Mercado', pending: 2, remaining: 60 },
          { listId: 'k', name: 'Casa', pending: 1, remaining: 40 },
        ],
        remaining: 100,
      },
    })

    expect(screen.getByLabelText('Comida · 75%')).toBeInTheDocument()
    expect(screen.getByLabelText('Transporte · 25%')).toBeInTheDocument()
    expect(screen.getByLabelText('Mercado · 60%')).toBeInTheDocument()
    expect(screen.getByLabelText('Casa · 40%')).toBeInTheDocument()
    expect(screen.getByLabelText('Viaje · 30% de la Meta')).toBeInTheDocument()
  })
})
