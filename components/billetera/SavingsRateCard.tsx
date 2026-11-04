'use client'

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { CurrencyId } from '@/constants/currencies'
import type { TimeRange } from '@/hooks/useWallet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { SAVINGS_RATE_FLOOR, type SavingsRateView } from '@/lib/wallet/savingsRate'
import { formatMoney } from './format'
import { PERIOD_TEXT, percent } from './StatsListParts'

const config: ChartConfig = {
  shown: { label: 'Ahorro', color: 'var(--rate-binance)' },
}

function headline(overall: number, range: TimeRange): string {
  const period = PERIOD_TEXT[range]
  return overall >= 0
    ? `Ahorraste el ${percent(overall)} de tus ingresos ${period}`
    : `Gastaste un ${percent(-overall)} más de lo que ingresaste ${period}`
}

export function SavingsRateCard({
  view,
  income,
  expense,
  byPeriod,
  currency,
  timeRange,
  className,
}: {
  view: SavingsRateView
  income: number
  expense: number
  /** «por mes» o «por trimestre», para la descripción de la línea. */
  byPeriod: string
  currency: CurrencyId
  timeRange: TimeRange
  className?: string
}) {
  const { overall, series, showLine } = view
  const minShown = Math.min(0, ...series.map((p) => p.shown ?? 0))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tasa de ahorro</CardTitle>
        <CardDescription>
          Qué parte de tus ingresos no gastaste{showLine ? `, y cómo fue ${byPeriod}` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {overall !== null && (
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'text-4xl font-black tabular-nums',
                overall < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'
              )}
            >
              {percent(overall)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-semibold">{headline(overall, timeRange)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Te quedaron {formatMoney(income - expense, currency)} de{' '}
                {formatMoney(income, currency)}
              </p>
            </div>
          </div>
        )}
        {showLine && (
          <ChartContainer config={config} className="min-h-48 w-full">
            <LineChart data={series} margin={{ left: 0, right: 12, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                domain={[Math.max(SAVINGS_RATE_FLOOR, Math.floor(minShown / 10) * 10), 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(_value, _name, item) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">Ahorro</span>
                        <span className="font-mono font-medium tabular-nums">
                          {(item.payload as { rate: number }).rate}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="shown"
                type="monotone"
                stroke="var(--color-shown)"
                strokeWidth={2}
                dot
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
