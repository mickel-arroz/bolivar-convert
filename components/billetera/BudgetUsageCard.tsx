'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { BudgetStatusRow, TimeRange } from '@/hooks/useWallet'
import { BudgetUsage, rankBudgetsByUsage } from '@/lib/wallet/compute'
import { getCategoryIcon } from '@/constants/walletCategories'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { formatMoney, formatPercent } from './format'
import { BarWithTip } from './StatsListParts'

const TOP = 3

const RANGE_TEXT: Record<TimeRange, string> = {
  '1m': 'este mes',
  '6m': 'en los últimos 6 meses',
  '1y': 'en el último año',
  all: 'desde tu primer presupuesto',
}

const ringConfig: ChartConfig = {
  used: { label: 'Usado', color: 'var(--rate-eur)' },
}

interface BudgetUsageCardProps {
  rows: BudgetStatusRow[]
  usage: BudgetUsage
  timeRange: TimeRange
  className?: string
}

export function BudgetUsageCard({ rows, usage, timeRange, className }: BudgetUsageCardProps) {
  const ranked = useMemo(() => rankBudgetsByUsage(rows), [rows])
  const shown = ranked.slice(0, TOP)
  const used = Math.min(usage.ratio, 1)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Presupuesto vs gastado</CardTitle>
        <CardDescription>
          Cuánto llevas usado de tus presupuestos {RANGE_TEXT[timeRange]}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative size-28 shrink-0">
            <ChartContainer config={ringConfig} className="aspect-square size-28">
              <PieChart>
                <Pie
                  data={[{ value: used }, { value: 1 - used }]}
                  dataKey="value"
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  <Cell fill={usage.ratio > 1 ? 'var(--destructive)' : 'var(--color-used)'} />
                  <Cell fill="var(--muted)" />
                </Pie>
              </PieChart>
            </ChartContainer>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-black tabular-nums">
              {formatPercent(usage.ratio)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-bold">Usado {formatPercent(usage.ratio)} del presupuesto total</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(usage.spent, usage.currency)} de{' '}
              {formatMoney(usage.total, usage.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {usage.onTrack} al día · {usage.over} sobrepasados
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Más consumidos
          </span>
          {shown.map(({ row, spent, ratio, isOver }) => {
            const Icon = getCategoryIcon(row.categoryIcon)
            const cur = row.budget.currency
            return (
              <div
                key={row.budget.id}
                data-testid="budget-usage-row"
                className="flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <Icon
                      className="size-4 shrink-0"
                      style={row.categoryColor ? { color: row.categoryColor } : undefined}
                    />
                    <span data-testid="budget-usage-name" className="truncate">
                      {row.categoryName}
                    </span>
                  </span>
                  {Number.isFinite(ratio) && (
                    <span
                      className={cn(
                        'shrink-0 text-xs font-bold tabular-nums',
                        isOver && 'text-destructive'
                      )}
                    >
                      {formatPercent(ratio)}
                    </span>
                  )}
                </div>
                <BarWithTip
                  label={
                    Number.isFinite(ratio)
                      ? `${row.categoryName} · ${formatPercent(ratio)} del presupuesto`
                      : `${row.categoryName} · gasto sin presupuesto disponible`
                  }
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      'h-full rounded-full',
                      isOver ? 'bg-destructive' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                  />
                </BarWithTip>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(spent, cur)} / {formatMoney(Math.max(row.effectiveLimit, 0), cur)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
