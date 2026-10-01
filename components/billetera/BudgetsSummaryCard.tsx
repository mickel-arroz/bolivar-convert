import type { BudgetsSummary } from '@/lib/wallet/compute'
import { getCurrency } from '@/constants/currencies'
import { Card, CardContent } from '@/components/ui/card'
import { TargetIcon, AlertIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

/**
 * Suma de todos los presupuestos del mes contra lo gastado. Usa la misma anatomía que las
 * tarjetas de presupuesto (encabezado, gastado «de» total, barra y desglose) para que se
 * lea como una más, pero ocupa dos columnas.
 *
 * La barra parte toda en verde (nada gastado) y el rojo va creciendo sobre ella a medida
 * que se gasta, acortando el verde.
 */
export function BudgetsSummaryCard({
  summary,
  className,
}: {
  summary: BudgetsSummary
  className?: string
}) {
  const cur = summary.currency
  const pct = summary.ratio * 100
  const over = summary.overflow > 1e-9

  // Los siete datos pedidos, en el orden en que se leen: qué hay, y qué va de eso.
  const items: { label: string; value: number }[] = [
    { label: 'Presupuesto total', value: summary.budget },
    { label: 'Extra', value: summary.extra },
    { label: 'Presupuesto + extra', value: summary.total },
    { label: 'Presupuesto libre', value: summary.freeBudget },
    { label: 'Extra libre', value: summary.extraLeft },
    { label: 'Presupuesto gastado', value: summary.spentBudget },
    { label: 'Extra gastado', value: summary.spentExtra },
  ]

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-bold">
            <TargetIcon className="size-4" />
            Todos los presupuestos
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {summary.count} presupuestos
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <span
            className={cn(
              'text-lg font-black tabular-nums',
              over ? 'text-destructive' : 'text-foreground'
            )}
          >
            {formatMoney(summary.spent, cur)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            de {formatMoney(summary.total, cur)}
          </span>
        </div>

        <div
          className="relative h-2 overflow-hidden rounded-full bg-green-500"
          role="progressbar"
          aria-label="Parte del presupuesto total ya gastada"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-destructive transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums sm:grid-cols-4">
          {items.map((it) => (
            <span key={it.label}>
              {it.label}:{' '}
              <span className={cn('font-bold text-foreground', it.value < 0 && 'text-destructive')}>
                {formatMoney(it.value, cur)}
              </span>
            </span>
          ))}
        </div>

        {over && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
            <AlertIcon className="size-3.5" />
            Superaste lo disponible en {formatMoney(summary.overflow, cur)}
          </p>
        )}
        {summary.converted && (
          <p className="text-[11px] text-muted-foreground">
            Hay presupuestos en distintas monedas: se suman convertidos a{' '}
            {getCurrency(cur).label.toLowerCase()} con la tasa configurada.
          </p>
        )}
        {summary.ratesMissing && (
          <p className="text-[11px] text-destructive">
            Falta una tasa de cambio: los presupuestos de otra moneda no están en esta suma.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
