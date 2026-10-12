'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { CurrencyId } from '@/constants/currencies'
import { WalletApi, formatMonthLabel } from '@/hooks/useWallet'
import { budgetableCategories, getCategoryIcon } from '@/constants/walletCategories'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { parseAmount } from '@/lib/wallet/compute'
import {
  isSettled,
  remainderGap,
  round2,
  splitMonthRemainder,
  type CloseDestination,
  type CloseMode,
  type MonthCloseAllocation,
} from '@/lib/wallet/monthClose'
import { formatMoney } from './format'

interface ConcludeMonthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  rates: Rates
  fromMonth: string | null
  toMonth: string
}

/** Destino de un Tramo en el selector: 'cat:<id>', 'goal:<id>' o 'none' (descartar). */
const NONE = 'none'

interface Tramo {
  dest: string
  value: string
}

interface RowPlan {
  mode: CloseMode
  tramos: Tramo[]
}

interface Row {
  categoryId: string
  name: string
  icon: string
  currency: CurrencyId
  remaining: number
}

const formatPercent = (n: number) => `${round2(n).toLocaleString('es-VE')} %`

const defaultPlan = (categoryId: string): RowPlan => ({
  mode: 'percent',
  tramos: [{ dest: `cat:${categoryId}`, value: '100' }],
})

function toDestination(dest: string): CloseDestination {
  if (dest.startsWith('cat:')) return { kind: 'category', categoryId: dest.slice(4) }
  if (dest.startsWith('goal:')) return { kind: 'goal', goalId: dest.slice(5) }
  return { kind: 'discard' }
}

export function ConcludeMonthDialog({
  open,
  onOpenChange,
  wallet,
  rates,
  fromMonth,
  toMonth,
}: ConcludeMonthDialogProps) {
  const { state, budgetStatusForMonth, concludeBudgetMonth } = wallet
  const [plans, setPlans] = useState<Record<string, RowPlan>>({})

  const rows = useMemo<Row[]>(() => {
    if (!fromMonth) return []
    return budgetStatusForMonth(rates, fromMonth).map((r) => ({
      categoryId: r.budget.categoryId,
      name: r.categoryName,
      icon: r.categoryIcon,
      currency: r.budget.currency,
      remaining: r.effectiveLimit - r.actual,
    }))
  }, [fromMonth, rates, budgetStatusForMonth])

  // Moneda del presupuesto de cada categoría en la plantilla activa (el del mes nuevo
  // manda); una categoría sin presupuesto acepta cualquier moneda, porque se crea.
  const budgetCurrency = useMemo(() => {
    const byCategory = new Map<string, CurrencyId>()
    for (const b of state.budgets) {
      if (b.templateId !== state.activeBudgetTemplateId) continue
      if (b.month === toMonth || (b.month === fromMonth && !byCategory.has(b.categoryId))) {
        byCategory.set(b.categoryId, b.currency)
      }
    }
    return byCategory
  }, [state.budgets, state.activeBudgetTemplateId, fromMonth, toMonth])

  const categories = useMemo(() => budgetableCategories(state.categories), [state.categories])

  // Al abrir, cada fila vuelve a su reparto por defecto (`planOf`). Solo al abrir: si las
  // filas se recalculan con el diálogo abierto, lo editado se conserva.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setPlans({})
  }, [open])

  if (!fromMonth) return null

  const planOf = (r: Row): RowPlan => plans[r.categoryId] ?? defaultPlan(r.categoryId)
  const updatePlan = (categoryId: string, plan: RowPlan) => setPlans((p) => ({ ...p, [categoryId]: plan }))

  // Una categoría sin presupuesto se crea en la moneda de quien le manda dinero, así que
  // no puede recibir tramos de dos monedas distintas.
  const newCategoryCurrencies = new Map<string, Set<CurrencyId>>()
  for (const r of rows) {
    for (const t of planOf(r).tramos) {
      if (!t.dest.startsWith('cat:') || budgetCurrency.has(t.dest.slice(4))) continue
      newCategoryCurrencies.set(t.dest, (newCategoryCurrencies.get(t.dest) ?? new Set()).add(r.currency))
    }
  }
  const mixesCurrencies = (plan: RowPlan) =>
    plan.tramos.some((t) => (newCategoryCurrencies.get(t.dest)?.size ?? 0) > 1)

  const splits = rows.map((r) => {
    if (isSettled(r.remaining)) return []
    const plan = planOf(r)
    if (mixesCurrencies(plan)) return null
    return splitMonthRemainder(r.remaining, plan.mode, plan.tramos.map((t) => parseAmount(t.value)))
  })
  const canConfirm = splits.every((s) => s !== null)

  const handleConfirm = () => {
    if (!canConfirm) return
    const allocations: MonthCloseAllocation[] = []
    rows.forEach((r, i) => {
      planOf(r).tramos.forEach((t, j) => {
        const amount = splits[i]?.[j]
        if (!amount) return
        allocations.push({ fromCategoryId: r.categoryId, destination: toDestination(t.dest), amount })
      })
    })
    concludeBudgetMonth(fromMonth, toMonth, allocations)
    onOpenChange(false)
  }

  const destinationLabel = (r: Row, dest: string): string => {
    if (dest === NONE) return 'Descartar'
    if (dest === `cat:${r.categoryId}`) return 'Arrastrar al próximo mes'
    if (dest.startsWith('cat:')) {
      return `Pasar a: ${categories.find((c) => `cat:${c.id}` === dest)?.name ?? '—'}`
    }
    return `Enviar a: ${state.goals.find((g) => `goal:${g.id}` === dest)?.name ?? '—'}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir {formatMonthLabel(fromMonth)}</DialogTitle>
          <DialogDescription>
            El estimado de cada categoría pasa a {formatMonthLabel(toMonth)}. Reparte el sobrante o
            déficit de cada una en uno o más tramos, por porcentaje o por monto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const Icon = getCategoryIcon(r.icon)
            const negative = r.remaining < 0
            const plan = planOf(r)
            const split = splits[i]
            const values = plan.tramos.map((t) => parseAmount(t.value))
            const gap = remainderGap(r.remaining, plan.mode, values)
            const acceptsCurrency = (categoryId: string) => {
              const fixed = budgetCurrency.get(categoryId)
              if (fixed) return fixed === r.currency
              const claimed = newCategoryCurrencies.get(`cat:${categoryId}`)
              return !claimed || [...claimed].every((c) => c === r.currency)
            }
            const formatGap = (n: number) =>
              plan.mode === 'percent' ? formatPercent(n) : formatMoney(n, r.currency)
            const problem = split
              ? null
              : mixesCurrencies(plan)
                ? 'Una categoría nueva no puede recibir tramos de dos monedas'
                : values.some((v) => v <= 0)
                  ? 'Cada tramo necesita una cantidad'
                  : Math.abs(gap) >= 0.005
                    ? `${gap > 0 ? 'Falta asignar' : 'Sobran'} ${formatGap(Math.abs(gap))}`
                    : 'El último tramo se queda sin monto: ajusta las cantidades'
            const destinations = [
              `cat:${r.categoryId}`,
              ...categories
                .filter((c) => c.id !== r.categoryId && acceptsCurrency(c.id))
                .map((c) => `cat:${c.id}`),
              ...(negative
                ? []
                : state.goals.filter((g) => g.currency === r.currency).map((g) => `goal:${g.id}`)),
              NONE,
            ]

            // Al cambiar de modo el último tramo se queda con lo que falte, para que un
            // reparto que cuadraba siga cuadrando pese al redondeo.
            const setMode = (mode: CloseMode) => {
              if (mode === plan.mode) return
              const total = Math.abs(r.remaining)
              const target = mode === 'amount' ? total : 100
              const converted = values.map((v) =>
                round2(mode === 'amount' ? (total * v) / 100 : total > 0 ? (v / total) * 100 : 0)
              )
              if (split) {
                const others = converted.slice(0, -1).reduce((a, b) => a + b, 0)
                converted[converted.length - 1] = round2(target - others)
              }
              updatePlan(r.categoryId, {
                mode,
                tramos: plan.tramos.map((t, j) => ({ ...t, value: String(converted[j]) })),
              })
            }
            const setTramo = (j: number, patch: Partial<Tramo>) =>
              updatePlan(r.categoryId, {
                ...plan,
                tramos: plan.tramos.map((t, k) => (k === j ? { ...t, ...patch } : t)),
              })
            const addTramo = () =>
              updatePlan(r.categoryId, {
                ...plan,
                tramos: [...plan.tramos, { dest: NONE, value: gap >= 0.005 ? String(round2(gap)) : '' }],
              })
            const removeTramo = (j: number) =>
              updatePlan(r.categoryId, { ...plan, tramos: plan.tramos.filter((_, k) => k !== j) })

            return (
              <div
                key={r.categoryId}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-bold">{r.name}</span>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          negative ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      >
                        {r.remaining > 0 ? '+' : ''}
                        {formatMoney(r.remaining, r.currency)} {negative ? 'déficit' : 'sobrante'}
                      </span>
                    </div>
                  </div>
                  {!isSettled(r.remaining) && (
                    <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
                      {(
                        [
                          { id: 'percent', label: '%' },
                          { id: 'amount', label: 'Monto' },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setMode(o.id)}
                          className={cn(
                            'rounded-md px-2 py-1 text-xs font-bold transition-all',
                            plan.mode === o.id
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isSettled(r.remaining) ? (
                  <p className="text-xs text-muted-foreground">Sin sobrante ni déficit.</p>
                ) : (
                  <>
                    {plan.tramos.map((t, j) => (
                      <div key={j} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
                        <div className="min-w-0 sm:flex-1">
                          <Select value={t.dest} onValueChange={(v) => setTramo(j, { dest: v as string })}>
                            <SelectTrigger className="w-full">
                              <SelectValue>{(val) => destinationLabel(r, String(val))}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {destinations.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {destinationLabel(r, d)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex flex-1 flex-col items-end sm:w-28 sm:flex-none">
                            <Input
                              aria-label={`Tramo ${j + 1} de ${r.name}`}
                              inputMode="decimal"
                              value={t.value}
                              onChange={(e) => setTramo(j, { value: e.target.value })}
                              className="text-right tabular-nums"
                            />
                            {plan.mode === 'percent' && split && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {formatMoney(split[j], r.currency)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="mt-1"
                            onClick={() => removeTramo(j)}
                            disabled={plan.tramos.length === 1}
                            aria-label={`Quitar tramo ${j + 1} de ${r.name}`}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addTramo}
                        aria-label={`Agregar tramo a ${r.name}`}
                      >
                        <PlusIcon className="size-4" /> Tramo
                      </Button>
                      {problem && (
                        <span className="text-xs font-semibold text-destructive tabular-nums">{problem}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay presupuestos en {formatMonthLabel(fromMonth)}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Concluir mes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
