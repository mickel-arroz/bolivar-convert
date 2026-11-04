import type { CurrencyId } from '@/constants/currencies'
import type { TimeRange } from '@/hooks/useWallet'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { SavingsPlanStat, StatsView } from '@/lib/wallet/statsPlansLists'
import { formatMoney } from './format'
import {
  BarWithTip,
  ItemIcon,
  PERIOD_TEXT,
  ScrollList,
  ShareRow,
  ShareSummary,
  colorOrPalette,
  percent,
} from './StatsListParts'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Un monto con su signo delante: «+$ 40.00» o «−$ 10.00». */
const signedMoney = (value: number, currency: CurrencyId) =>
  `${value < 0 ? '−' : '+'}${formatMoney(Math.abs(value), currency)}`

function ProgressRing({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div
      className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${clamp01(ratio) * 360}deg, var(--muted) 0deg)`,
      }}
    >
      <div className="absolute inset-[9px] rounded-full bg-card" />
      <span className="relative text-lg font-black tabular-nums">{percent(ratio)}</span>
    </div>
  )
}

function PlanRow({ plan }: { plan: SavingsPlanStat }) {
  const color = plan.color ?? DEFAULT_ACCOUNT_COLOR
  const ratio = plan.target === null ? null : plan.saved / plan.target
  const reached = ratio !== null && ratio >= 1
  return (
    <div data-testid="stats-plan-row" className="flex items-center gap-3 py-2.5">
      <ItemIcon icon={getAccountIcon(plan.icon)} color={color} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{plan.name}</span>
          {ratio === null ? (
            <span className="shrink-0 text-sm font-bold tabular-nums">
              {formatMoney(plan.saved, plan.currency)}
            </span>
          ) : reached ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
              <CheckIcon className="size-3" />
              Meta alcanzada
            </span>
          ) : (
            <span className="shrink-0 text-xs font-bold tabular-nums">{percent(ratio)}</span>
          )}
        </div>
        {ratio === null ? (
          <span className="text-xs text-muted-foreground">Sin Meta</span>
        ) : (
          <>
            <BarWithTip
              label={`${plan.name} · ${percent(ratio)} de la Meta`}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${clamp01(ratio) * 100}%`, backgroundColor: color }}
              />
            </BarWithTip>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(plan.saved, plan.currency)} de{' '}
              {formatMoney(plan.target ?? 0, plan.currency)}
            </span>
          </>
        )}
        {plan.contributed !== 0 && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              plan.contributed > 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
            )}
          >
            {signedMoney(plan.contributed, plan.currency)} en el periodo
          </span>
        )}
      </div>
    </div>
  )
}

function contributedText(value: number | null, currency: CurrencyId, range: TimeRange): string {
  const period = PERIOD_TEXT[range]
  if (value === null) return `Lo aportado ${period} no se puede convertir sin tasas`
  if (value === 0) return `Sin aportes ${period}`
  return `${value > 0 ? 'Aportaste' : 'Retiraste'} ${formatMoney(Math.abs(value), currency)} ${period}`
}

export function SavingsPlansStatsCard({
  plans,
  currency,
  timeRange,
  className,
}: {
  plans: StatsView['savingsPlans']
  currency: CurrencyId
  timeRange: TimeRange
  className?: string
}) {
  const { rows, progress } = plans
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Planes de ahorro</CardTitle>
        <CardDescription>Cuánto llevas de tus Metas.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {progress && (
          <div className="flex items-center gap-4">
            <ProgressRing
              ratio={progress.target > 0 ? progress.saved / progress.target : 0}
              color="var(--wallet-green)"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-bold tabular-nums">
                {formatMoney(progress.saved, currency)} de {formatMoney(progress.target, currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {progress.reached} de {progress.withTarget} Metas alcanzadas
              </p>
              <p className="text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'plan activo' : 'planes activos'}
              </p>
            </div>
          </div>
        )}
        <p className="text-sm font-semibold">
          {contributedText(plans.contributed, currency, timeRange)}
        </p>
        <ScrollList>
          {rows.map((plan) => (
            <PlanRow key={plan.goalId} plan={plan} />
          ))}
        </ScrollList>
      </CardContent>
    </Card>
  )
}

function listDetail(pending: number, purchased: string | null): string {
  const left = pending > 0 ? `${pending} por comprar` : 'Nada por comprar'
  return purchased === null ? left : `${left} · ${purchased} comprado`
}

export function ShoppingListsStatsCard({
  lists,
  currency,
  timeRange,
  className,
}: {
  lists: StatsView['shoppingLists']
  currency: CurrencyId
  timeRange: TimeRange
  className?: string
}) {
  const total = lists.remaining
  const products = lists.rows.reduce((sum, row) => sum + row.pending, 0)
  const rows = lists.rows.map((row, i) => ({
    ...row,
    color: colorOrPalette(row.color, i),
    share: total && row.remaining !== null ? row.remaining / total : null,
  }))
  const money = (value: number | null) => (value === null ? '—' : formatMoney(value, currency))
  const parts = rows.every((row) => row.share !== null)
    ? rows.map((row) => ({
        id: row.listId,
        name: row.name,
        share: row.share ?? 0,
        color: row.color,
      }))
    : undefined

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Listas de compras</CardTitle>
        <CardDescription>Lo que te falta por pagar en cada lista.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ShareSummary
          label="Restante total por pagar"
          amount={money(total)}
          detail={`${products} ${products === 1 ? 'producto' : 'productos'} en ${rows.length} ${rows.length === 1 ? 'lista' : 'listas'}`}
          note={`Comprado ${PERIOD_TEXT[timeRange]}: ${money(lists.purchased)}`}
          parts={parts}
        />
        <ScrollList>
          {rows.map((row) => (
            <ShareRow
              key={row.listId}
              testId="stats-list-row"
              icon={getAccountIcon(row.icon)}
              color={row.color}
              name={row.name}
              detail={listDetail(row.pending, row.purchased ? money(row.purchased) : null)}
              amount={money(row.remaining)}
              share={row.share}
            />
          ))}
        </ScrollList>
      </CardContent>
    </Card>
  )
}
