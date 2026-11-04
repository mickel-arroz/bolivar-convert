import { createElement } from 'react'
import type { CurrencyId } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SavingsPlanStat, StatsView } from '@/lib/wallet/statsPlansLists'
import { formatMoney } from './format'

interface BarRowProps {
  name: string
  icon?: string
  color?: string
  amount: string
  /** Ancho de la barra, de 0 a 1. Sin valor, la fila no lleva barra. */
  ratio?: number
}

function BarRow({ name, icon, color, amount, ratio }: BarRowProps) {
  const accent = color ?? DEFAULT_ACCOUNT_COLOR
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          {createElement(getAccountIcon(icon), {
            className: 'size-4 shrink-0',
            style: { color: accent },
          })}
          <span className="truncate">{name}</span>
        </span>
        <span className="shrink-0 font-bold tabular-nums">{amount}</span>
      </div>
      {ratio !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, ratio) * 100)}%`,
              backgroundColor: accent,
            }}
          />
        </div>
      )}
    </div>
  )
}

function planAmount(plan: SavingsPlanStat): string {
  const saved = formatMoney(plan.saved, plan.currency)
  if (plan.target === null) return saved
  const pct = Math.round((plan.saved / plan.target) * 100)
  return `${saved} de ${formatMoney(plan.target, plan.currency)} · ${pct}%`
}

export function SavingsPlansStatsCard({
  plans,
  className,
}: {
  plans: StatsView['savingsPlans']
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Planes de ahorro</CardTitle>
        <CardDescription>Lo ahorrado frente a la Meta, en la moneda de cada plan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {plans.map((plan) => (
          <BarRow
            key={plan.goalId}
            name={plan.name}
            icon={plan.icon}
            color={plan.color}
            amount={planAmount(plan)}
            ratio={plan.target === null ? undefined : plan.saved / plan.target}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function ShoppingListsStatsCard({
  lists,
  currency,
  className,
}: {
  lists: StatsView['shoppingLists']
  currency: CurrencyId
  className?: string
}) {
  const max = Math.max(0, ...lists.rows.map((r) => r.remaining ?? 0))
  const money = (value: number | null) => (value === null ? '—' : formatMoney(value, currency))
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Listas de compras</CardTitle>
        <CardDescription>Restante por pagar de cada lista.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lists.rows.map((row) => (
          <BarRow
            key={row.listId}
            name={row.name}
            icon={row.icon}
            color={row.color}
            amount={money(row.remaining)}
            ratio={row.remaining === null || max <= 0 ? undefined : row.remaining / max}
          />
        ))}
        <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="font-medium text-muted-foreground">Restante total por pagar</span>
          <span className="font-black tabular-nums">{money(lists.remaining)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
