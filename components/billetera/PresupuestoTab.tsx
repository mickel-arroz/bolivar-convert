'use client'

import { useMemo } from 'react'
import { StatsBundle, WalletApi, monthKey, formatMonthLabel } from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCategoryIcon } from '@/constants/walletCategories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusIcon, TargetIcon, PencilIcon, TrashIcon, AlertIcon, RefreshIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { WalletDialogs } from './dialogs'
import { formatMoney } from './format'

interface PresupuestoTabProps {
  wallet: WalletApi
  stats: StatsBundle
  dialogs: WalletDialogs
  rates: Rates
}

export function PresupuestoTab({ wallet, stats, dialogs, rates }: PresupuestoTabProps) {
  const { state, removeBudget, budgetStatusForMonth, concludeBudgetMonth } = wallet
  const month = useMemo(() => monthKey(new Date()), [])

  const budgetedCategoryIds = useMemo(
    () => new Set(stats.budgetStatus.map((b) => b.budget.categoryId)),
    [stats.budgetStatus]
  )

  const unbudgeted = useMemo(
    () => state.categories.filter((c) => c.kind === 'expense' && !budgetedCategoryIds.has(c.id)),
    [state.categories, budgetedCategoryIds]
  )

  // Mes pasado con presupuesto que aún no se ha concluido (el más reciente)
  const pastMonth = useMemo(() => {
    const months = new Set(state.budgets.map((b) => b.month))
    const past = [...months].filter((m) => m < month && !state.concludedMonths.includes(m)).sort()
    return past.length > 0 ? past[past.length - 1] : null
  }, [state.budgets, state.concludedMonths, month])

  const handleConclude = () => {
    if (!pastMonth) return
    const rows = budgetStatusForMonth(rates, pastMonth)
    const carryovers: Record<string, number> = {}
    for (const r of rows) carryovers[r.budget.categoryId] = r.effectiveLimit - r.actual
    concludeBudgetMonth(pastMonth, month, carryovers)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Presupuesto de {formatMonthLabel(month)}
          </h2>
          <p className="text-xs text-muted-foreground">Gasto estimado por categoría este mes.</p>
        </div>
        <Button onClick={() => dialogs.openBudget()} disabled={state.categories.every((c) => c.kind !== 'expense')}>
          <PlusIcon /> Asignar presupuesto
        </Button>
      </div>

      {/* Aviso de mes anterior por concluir */}
      {pastMonth && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <RefreshIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="text-sm font-bold">Tienes presupuestos de {formatMonthLabel(pastMonth)} sin concluir</p>
              <p className="text-xs text-muted-foreground">
                Al concluir, el estimado pasa a {formatMonthLabel(month)} y el sobrante (o déficit) se
                arrastra como extra.
              </p>
            </div>
          </div>
          <Button onClick={handleConclude} className="shrink-0 sm:self-center">
            Concluir {formatMonthLabel(pastMonth)}
          </Button>
        </div>
      )}

      {!stats.ratesAvailable && (
        <p className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Faltan tasas de cambio para comparar gastos en distintas monedas con el presupuesto.
        </p>
      )}

      {stats.budgetStatus.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <TargetIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No has asignado presupuestos este mes. Define un límite por categoría para controlar tus gastos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {stats.budgetStatus.map((row) => {
            const Icon = getCategoryIcon(row.categoryIcon)
            const pct = row.effectiveLimit > 0 ? Math.min(100, (row.actual / row.effectiveLimit) * 100) : 0
            const nearLimit = !row.isOver && row.ratio >= 0.8
            const cur = row.budget.currency
            return (
              <Card key={row.budget.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-bold">
                      <Icon className="size-4" />
                      {row.categoryName}
                    </span>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => dialogs.openBudget(row.budget.categoryId)}
                        aria-label="Editar presupuesto"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeBudget(row.budget.id)}
                        aria-label="Eliminar presupuesto"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <span
                      className={cn(
                        'text-lg font-black tabular-nums',
                        row.isOver ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {formatMoney(row.actual, cur)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      de {formatMoney(row.effectiveLimit, cur)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        row.isOver ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-green-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Desglose estimado + extra arrastrado */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                    <span>Estimado: {formatMoney(row.limit, cur)}</span>
                    {row.carryover !== 0 && (
                      <span className={cn(row.carryover < 0 && 'text-destructive')}>
                        Extra: {row.carryover > 0 ? '+' : ''}
                        {formatMoney(row.carryover, cur)}
                      </span>
                    )}
                  </div>

                  {row.isOver && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                      <AlertIcon className="size-3.5" />
                      Superaste el presupuesto en {formatMoney(row.actual - row.effectiveLimit, cur)}
                    </p>
                  )}
                  {nearLimit && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                      Cerca del límite ({Math.round(row.ratio * 100)}%)
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {unbudgeted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sin presupuesto
          </h3>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map((c) => {
              const Icon = getCategoryIcon(c.icon)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => dialogs.openBudget(c.id)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {c.name}
                  <PlusIcon className="size-3.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
