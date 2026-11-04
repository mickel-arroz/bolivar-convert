import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EstadisticasTab } from '@/components/billetera/EstadisticasTab'
import type { BudgetStatusRow, CategorySummaryRow, TimeRange, WalletApi } from '@/hooks/useWallet'
import { EMPTY_STATS_VIEW, type StatsView } from '@/lib/wallet/statsView'

let stats: StatsView | undefined
let adviceLoaded = true
let requestedUrl = ''
vi.mock('@/hooks/useWalletResource', () => ({
  useWalletResource: (url: string) => {
    requestedUrl = url
    return { data: stats }
  },
}))
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

function renderTab(
  data: StatsView | undefined,
  accounts: { id: string }[] = [],
  timeRange: TimeRange = '1m',
  /** Sin `fresh`, los datos se dejan tal cual: pueden ser de otra selección. */
  fresh = true
) {
  stats =
    data && fresh
      ? { ...data, params: { timeRange, displayCurrency: 'USD', statsRateSource: 'bcvUsd' } }
      : data
  const wallet = {
    state: { displayCurrency: 'USD', statsRateSource: 'bcvUsd', timeRange, accounts },
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
      periodSeries: [{ period: '2026-10', label: 'oct', income: 0, expense: 30 }],
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
        periodSeries: [{ period: '2026-10', label: 'oct', income: 100, expense: 30 }],
        netWorthSeries: [{ period: '2026-10', label: 'oct', value: 70 }],
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
          {
            goalId: 'viaje',
            name: 'Viaje',
            currency: 'USD',
            saved: 150,
            contributed: 0,
            target: 500,
          },
          {
            goalId: 'moto',
            name: 'Moto',
            currency: 'USD',
            saved: 200,
            contributed: 0,
            target: 200,
          },
          {
            goalId: 'colchon',
            name: 'Colchón',
            currency: 'VES',
            saved: 30,
            contributed: 0,
            target: null,
          },
        ],
        progress: { saved: 350, target: 700, reached: 1, withTarget: 2 },
        contributed: 0,
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
        rows: [
          {
            goalId: 'colchon',
            name: 'Colchón',
            currency: 'VES',
            saved: 30,
            contributed: 0,
            target: null,
          },
        ],
        progress: null,
        contributed: 0,
      },
    })

    expect(card('Planes de ahorro')).not.toHaveTextContent('Metas alcanzadas')
  })

  it('resume el Restante total por pagar y detalla cada lista con su peso', () => {
    renderTab({
      ...EMPTY,
      shoppingLists: {
        rows: [
          { listId: 'mercado', name: 'Mercado', pending: 2, remaining: 75, purchased: 0 },
          { listId: 'casa', name: 'Casa', pending: 1, remaining: 25, purchased: 0 },
        ],
        remaining: 100,
        purchased: 0,
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
          contributed: 0,
          target: null,
        })),
        progress: null,
        contributed: 0,
      },
      shoppingLists: {
        rows: Array.from({ length: 20 }, (_, i) => ({
          listId: `l${i}`,
          name: `Lista ${i}`,
          pending: 1,
          remaining: i + 1,
          purchased: 0,
        })),
        remaining: 210,
        purchased: 0,
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
        rows: [
          { goalId: 'v', name: 'Viaje', currency: 'USD', saved: 150, contributed: 0, target: 500 },
        ],
        progress: null,
        contributed: 0,
      },
      shoppingLists: {
        rows: [
          { listId: 'm', name: 'Mercado', pending: 2, remaining: 60, purchased: 0 },
          { listId: 'k', name: 'Casa', pending: 1, remaining: 40, purchased: 0 },
        ],
        remaining: 100,
        purchased: 0,
      },
    })

    expect(screen.getByLabelText('Comida · 75%')).toBeInTheDocument()
    expect(screen.getByLabelText('Transporte · 25%')).toBeInTheDocument()
    expect(screen.getByLabelText('Mercado · 60%')).toBeInTheDocument()
    expect(screen.getByLabelText('Casa · 40%')).toBeInTheDocument()
    expect(screen.getByLabelText('Viaje · 30% de la Meta')).toBeInTheDocument()
  })
})

describe('EstadisticasTab — Presupuesto vs gastado según el rango', () => {
  const budgetRow = {
    budget: { id: 'b', categoryId: 'food', currency: 'USD', month: '2026-11' },
    categoryName: 'Comida',
    categoryIcon: 'food',
    actual: 50,
    limit: 100,
    carryover: 0,
    carriedDeficit: 0,
    effectiveLimit: 100,
    ratio: 0.5,
    isOver: false,
  } as BudgetStatusRow
  const withBudget = { ...EMPTY, budgetRange: [budgetRow] }

  it.each([
    ['1m', 'este mes'],
    ['6m', 'en los últimos 6 meses'],
    ['1y', 'en el último año'],
    ['all', 'desde tu primer presupuesto'],
  ] as const)('con %s dice que abarca %s', (range, text) => {
    renderTab(withBudget, [], range)
    expect(card('Presupuesto vs gastado')).toHaveTextContent(text)
  })

  it('usa los presupuestos del rango, no solo los del mes actual', () => {
    renderTab({ ...EMPTY, budgetStatus: [budgetRow] })
    expect(screen.queryByText('Presupuesto vs gastado')).not.toBeInTheDocument()
  })
})

describe('EstadisticasTab — Planes y Listas según el rango', () => {
  const data: StatsView = {
    ...EMPTY,
    savingsPlans: {
      rows: [
        { goalId: 'v', name: 'Viaje', currency: 'USD', saved: 240, contributed: 40, target: 500 },
        { goalId: 'c', name: 'Colchón', currency: 'USD', saved: 30, contributed: 0, target: null },
      ],
      progress: null,
      contributed: 40,
    },
    shoppingLists: {
      rows: [
        { listId: 'm', name: 'Mercado', pending: 2, remaining: 10, purchased: 400 },
        { listId: 'k', name: 'Casa', pending: 0, remaining: 0, purchased: 5 },
      ],
      remaining: 10,
      purchased: 405,
    },
  }

  it.each([
    ['1m', 'en el último mes'],
    ['6m', 'en los últimos 6 meses'],
    ['1y', 'en el último año'],
    ['all', 'desde el inicio'],
  ] as const)('con %s resume lo aportado y lo comprado %s', (range, text) => {
    renderTab(data, [], range)

    expect(card('Planes de ahorro')).toHaveTextContent(`Aportaste $ 40.00 ${text}`)
    expect(card('Listas de compras')).toHaveTextContent(`Comprado ${text}: $ 405.00`)
  })

  it('cada fila dice lo suyo del periodo', () => {
    renderTab(data)

    const [viaje, colchon] = within(card('Planes de ahorro')).getAllByTestId('stats-plan-row')
    expect(viaje).toHaveTextContent('+$ 40.00 en el periodo')
    expect(colchon).not.toHaveTextContent('en el periodo')

    const [mercado, casa] = within(card('Listas de compras')).getAllByTestId('stats-list-row')
    expect(mercado).toHaveTextContent('2 por comprar · $ 400.00 comprado')
    expect(casa).toHaveTextContent('Nada por comprar · $ 5.00 comprado')
  })
})

describe('EstadisticasTab — Tasa de ahorro', () => {
  const month = (m: string, income: number, expense: number) => ({
    period: m,
    label: m,
    income,
    expense,
  })

  it('en 1M muestra solo la tasa del periodo, sin línea por semanas', () => {
    renderTab(
      {
        ...EMPTY,
        incomeVsExpense: { income: 1000, expense: 770 },
        grouping: 'week',
        periodSeries: [month('2026-10-26', 1000, 300), month('2026-11-02', 0, 470)],
      },
      [],
      '1m'
    )

    const tasa = card('Tasa de ahorro')
    expect(tasa).toHaveTextContent('23%')
    expect(tasa).toHaveTextContent('Ahorraste el 23% de tus ingresos en el último mes')
    expect(tasa).toHaveTextContent('Te quedaron $ 230.00 de $ 1,000.00')
    expect(within(tasa).queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('con varios meses suma la línea mes a mes', () => {
    renderTab(
      {
        ...EMPTY,
        incomeVsExpense: { income: 300, expense: 150 },
        periodSeries: [month('2026-10', 100, 50), month('2026-11', 200, 100)],
      },
      [],
      '6m'
    )

    const tasa = card('Tasa de ahorro')
    expect(tasa).toHaveTextContent('Ahorraste el 50% de tus ingresos en los últimos 6 meses')
    expect(within(tasa).getByTestId('chart')).toBeInTheDocument()
  })

  it('si gastaste más de lo que ingresaste lo dice así', () => {
    renderTab(
      {
        ...EMPTY,
        incomeVsExpense: { income: 100, expense: 115 },
        periodSeries: [month('2026-11', 100, 115)],
      },
      [],
      '1y'
    )

    expect(card('Tasa de ahorro')).toHaveTextContent(
      'Gastaste un 15% más de lo que ingresaste en el último año'
    )
  })
})

describe('EstadisticasTab — datos de otra selección', () => {
  it('pide las estadísticas con el Periodo, la moneda y la fuente elegidos', () => {
    renderTab(EMPTY, [], '6m')
    expect(requestedUrl).toBe('/api/wallet/stats?range=6m&currency=USD&source=bcvUsd')
  })

  it.each([
    ['otra moneda', { displayCurrency: 'VES' }],
    ['otra fuente', { statsRateSource: 'binanceUsdAvg' }],
    ['otro Periodo', { timeRange: '6m' }],
  ] as const)('con datos de %s muestra todo en skeleton hasta que llegan los nuevos', (_, diff) => {
    renderTab(
      {
        ...EMPTY,
        incomeVsExpense: { income: 100, expense: 30 },
        params: { timeRange: '1m', displayCurrency: 'USD', statsRateSource: 'bcvUsd', ...diff },
      },
      [],
      '1m',
      false
    )

    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Balance')).not.toBeInTheDocument()
    expect(screen.getByTestId('advice')).toBeInTheDocument()
  })

  it('con datos de lo elegido no hay skeleton', () => {
    renderTab({ ...EMPTY, incomeVsExpense: { income: 100, expense: 30 } })

    expect(screen.queryByTestId('stats-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('Balance')).toBeInTheDocument()
  })
})
