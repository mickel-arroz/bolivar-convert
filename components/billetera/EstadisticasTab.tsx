'use client'

import { useMemo, type ReactNode } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts'
import { TimeRange, WalletApi } from '@/hooks/useWallet'
import { useWalletResource } from '@/hooks/useWalletResource'
import { useAdvice } from '@/hooks/useAdvice'
import { EstadisticasSkeleton } from './skeletons'
import { getCurrency } from '@/constants/currencies'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { ChartPieIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatsChartId, statsChartGrid, visibleStatsCharts } from '@/lib/wallet/statsCharts'
import { EMPTY_STATS_VIEW, type StatsView } from '@/lib/wallet/statsPlansLists'
import type { Granularity } from '@/lib/wallet/periods'
import { AdviceCard } from './AdviceCard'
import { CategoryStatsCard } from './CategoryStatsCard'
import { BudgetUsageCard } from './BudgetUsageCard'
import { CurrencyToggle } from './fields'
import { formatMoney } from './format'
import { SavingsPlansStatsCard, ShoppingListsStatsCard } from './PlansAndListsStatsCards'

interface EstadisticasTabProps {
  wallet: WalletApi
}

const EMPTY_STATS = EMPTY_STATS_VIEW

const BY_PERIOD: Record<Granularity, string> = {
  week: 'por semana',
  month: 'por mes',
  quarter: 'por trimestre',
}

/** Con tan pocos puntos, una línea sin marcas apenas se ve (con uno, nada). */
const FEW_POINTS = 2

const RANGES: { id: TimeRange; label: string }[] = [
  { id: '1m', label: '1M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1A' },
  { id: 'all', label: 'Todo' },
]

const chartConfig: ChartConfig = {
  income: { label: 'Ingresos', color: 'var(--rate-usd)' },
  expense: { label: 'Gastos', color: 'var(--destructive)' },
}

const netWorthConfig: ChartConfig = {
  value: { label: 'Patrimonio', color: 'var(--rate-usd)' },
}

const savingsConfig: ChartConfig = {
  rate: { label: 'Ahorro %', color: 'var(--rate-binance)' },
}

function compact(value: number): string {
  return Number(value).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
}

function fillsRow(index: number, count: number): boolean {
  return count % 2 === 1 && index === count - 1
}

export function EstadisticasTab({ wallet }: EstadisticasTabProps) {
  const { state, setTimeRange, setDisplayCurrency, setStatsRateSource } = wallet
  const cur = state.displayCurrency
  const { advice, loaded: adviceLoaded } = useAdvice()

  const { data } = useWalletResource<StatsView>(
    `/api/wallet/stats?range=${state.timeRange}`,
    wallet.syncedVersion
  )
  const stats = data ?? EMPTY_STATS

  const expenseRows = useMemo(
    () => stats.categorySummary.filter((r) => r.kind === 'expense'),
    [stats.categorySummary]
  )
  const incomeRows = useMemo(
    () => stats.categorySummary.filter((r) => r.kind === 'income'),
    [stats.categorySummary]
  )
  const balance = stats.incomeVsExpense.income - stats.incomeVsExpense.expense
  const fewPoints = stats.monthlySeries.length <= FEW_POINTS

  const hasAccounts = state.accounts.length > 0
  const visible = useMemo(() => visibleStatsCharts(stats, hasAccounts), [stats, hasAccounts])
  const chartIds = visible.filter((id) => statsChartGrid(id) === 'charts')
  const categoryIds = visible.filter((id) => statsChartGrid(id) === 'categories')

  // Tasa de ahorro por periodo: (ingresos − gastos) / ingresos.
  const savingsSeries = useMemo(
    () =>
      stats.monthlySeries.map((p) => ({
        label: p.label,
        rate: p.income > 0 ? Math.round(((p.income - p.expense) / p.income) * 100) : 0,
      })),
    [stats.monthlySeries]
  )

  const cardRenderers: Record<StatsChartId, (className?: string) => ReactNode> = {
    incomeVsExpense: (className) => (
      <Card key="incomeVsExpense" className={className}>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>
            Evolución {BY_PERIOD[stats.seriesGranularity]} en {getCurrency(cur).label.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-56 w-full">
            <BarChart data={stats.monthlySeries} margin={{ left: 0, right: 12, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(v) => compact(v as number)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    ),
    netWorth: (className) => (
      <Card key="netWorth" className={className}>
        <CardHeader>
          <CardTitle>Patrimonio neto</CardTitle>
          <CardDescription>
            Evolución acumulada de tus cuentas {BY_PERIOD[stats.seriesGranularity]}, en{' '}
            {getCurrency(cur).label.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={netWorthConfig} className="min-h-56 w-full">
            <AreaChart data={stats.netWorthSeries} margin={{ left: 0, right: 12, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(v) => compact(v as number)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={fewPoints}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    ),
    savingsRate: (className) => (
      <Card key="savingsRate" className={className}>
        <CardHeader>
          <CardTitle>Tasa de ahorro</CardTitle>
          <CardDescription>
            Porcentaje de tus ingresos que no gastaste, {BY_PERIOD[stats.seriesGranularity]}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={savingsConfig} className="min-h-56 w-full">
            <LineChart data={savingsSeries} margin={{ left: 0, right: 12, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="rate"
                type="monotone"
                stroke="var(--color-rate)"
                strokeWidth={2}
                dot={fewPoints}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    ),
    budget: (className) => (
      <BudgetUsageCard
        key="budget"
        className={className}
        rows={stats.budgetStatus}
        usage={stats.budgetUsage}
      />
    ),
    expenseByCategory: (className) => (
      <CategoryStatsCard
        key="expenseByCategory"
        title="Gastos por categoría"
        totalLabel="Total de gastos"
        rows={expenseRows}
        currency={cur}
        className={className}
      />
    ),
    incomeByCategory: (className) => (
      <CategoryStatsCard
        key="incomeByCategory"
        title="Ingresos por categoría"
        totalLabel="Total de ingresos"
        rows={incomeRows}
        currency={cur}
        className={className}
      />
    ),
    savingsPlans: (className) => (
      <SavingsPlansStatsCard
        key="savingsPlans"
        plans={stats.savingsPlans}
        currency={cur}
        className={className}
      />
    ),
    shoppingLists: (className) => (
      <ShoppingListsStatsCard
        key="shoppingLists"
        lists={stats.shoppingLists}
        currency={cur}
        className={className}
      />
    ),
  }

  const adviceCard = (
    <AdviceCard title="En qué se te fue el dinero" text={advice.stats} loading={!adviceLoaded} />
  )

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {adviceCard}
        <EstadisticasSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {adviceCard}

      {/* Controles */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Izquierda: moneda de visualización + fuente de tasa */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mostrar en
              </span>
              <div className="w-32">
                <CurrencyToggle value={cur} onChange={setDisplayCurrency} />
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
              {(['bcvUsd', 'binanceUsdAvg'] as const).map((src) => (
                <Button
                  key={src}
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsRateSource(src)}
                  className={cn(
                    'h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider',
                    state.statsRateSource === src && 'bg-background shadow-sm'
                  )}
                >
                  {src === 'bcvUsd' ? 'BCV' : 'Binance'}
                </Button>
              ))}
            </div>
          </div>

          {/* Derecha: rango de tiempo */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1 sm:justify-end">
            {RANGES.map((r) => (
              <Button
                key={r.id}
                variant={state.timeRange === r.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(r.id)}
                className={cn(
                  'h-8 px-3 text-[10px] font-bold uppercase tracking-wider',
                  state.timeRange === r.id && 'bg-background shadow-sm'
                )}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {!stats.ratesAvailable && (
          <p className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Faltan tasas de cambio para normalizar las estadísticas. Conéctate para actualizarlas.
          </p>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingresos</span>
            <span className="text-lg font-black tabular-nums text-green-600 dark:text-green-400">
              {formatMoney(stats.incomeVsExpense.income, cur)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gastos</span>
            <span className="text-lg font-black tabular-nums text-destructive">
              {formatMoney(stats.incomeVsExpense.expense, cur)}
            </span>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</span>
            <span
              className={cn(
                'text-lg font-black tabular-nums',
                balance < 0 ? 'text-destructive' : 'text-foreground'
              )}
            >
              {formatMoney(balance, cur)}
            </span>
          </CardContent>
        </Card>
      </div>

      {visible.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ChartPieIcon className="size-8 opacity-20" />
            <p className="text-sm">Registra movimientos para ver tus estadísticas.</p>
          </CardContent>
        </Card>
      )}

      {/* Gráficas: 1 columna en móvil, 2 columnas en pantallas grandes */}
      {chartIds.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {chartIds.map((id, i) =>
            cardRenderers[id](fillsRow(i, chartIds.length) ? 'lg:col-span-2' : undefined)
          )}
        </div>
      )}

      {/* Resumen por categoría */}
      {categoryIds.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {categoryIds.map((id, i) =>
            cardRenderers[id](fillsRow(i, categoryIds.length) ? 'md:col-span-2' : undefined)
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Las estadísticas convierten todas las monedas a {getCurrency(cur).label.toLowerCase()} usando la
        tasa actual (no la tasa histórica de cada movimiento).
      </p>
    </div>
  )
}
