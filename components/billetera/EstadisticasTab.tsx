'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { StatsBundle, TimeRange, WalletApi } from '@/hooks/useWallet'
import { getCurrency } from '@/constants/currencies'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { getCategoryIcon } from '@/constants/walletCategories'
import { ChartPieIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CurrencyToggle } from './fields'
import { formatMoney } from './format'

interface EstadisticasTabProps {
  wallet: WalletApi
  stats: StatsBundle
}

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

function compact(value: number): string {
  return Number(value).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
}

export function EstadisticasTab({ wallet, stats }: EstadisticasTabProps) {
  const { state, setTimeRange, setDisplayCurrency, setStatsRateSource } = wallet
  const cur = state.displayCurrency

  const expenseRows = useMemo(
    () => stats.categorySummary.filter((r) => r.kind === 'expense'),
    [stats.categorySummary]
  )
  const incomeRows = useMemo(
    () => stats.categorySummary.filter((r) => r.kind === 'income'),
    [stats.categorySummary]
  )
  const maxExpense = Math.max(1, ...expenseRows.map((r) => r.total))
  const maxIncome = Math.max(1, ...incomeRows.map((r) => r.total))
  const balance = stats.incomeVsExpense.income - stats.incomeVsExpense.expense

  const renderCategoryList = (
    rows: typeof expenseRows,
    max: number,
    accent: string,
    emptyLabel: string
  ) => {
    if (rows.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    }
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const Icon = getCategoryIcon(row.icon)
          return (
            <div key={row.categoryId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" style={row.color ? { color: row.color } : undefined} />
                  {row.name}
                </span>
                <span className="font-bold tabular-nums">{formatMoney(row.total, cur)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', accent)}
                  style={{ width: `${Math.min(100, (row.total / max) * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* Evolución mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>Evolución por mes en {getCurrency(cur).label.toLowerCase()}.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.monthlySeries.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ChartPieIcon className="size-8 opacity-20" />
              <p className="text-sm">No hay datos en este periodo.</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Resumen por categoría */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCategoryList(expenseRows, maxExpense, 'bg-destructive', 'Sin gastos en este periodo.')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCategoryList(incomeRows, maxIncome, 'bg-green-500', 'Sin ingresos en este periodo.')}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Las estadísticas convierten todas las monedas a {getCurrency(cur).label.toLowerCase()} usando la
        tasa actual (no la tasa histórica de cada movimiento).
      </p>
    </div>
  )
}
