'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { CurrencyId, getCurrency } from '@/constants/currencies'
import { WalletApi, formatMonthLabel } from '@/hooks/useWallet'
import { budgetableCategories, getAccountIcon, getCategoryIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from '@/components/icons'
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { parseAmount, parseSigned } from '@/lib/wallet/compute'
import {
  isSettled,
  projectCarryovers,
  remainderGap,
  round2,
  splitMonthRemainder,
  type CloseDestination,
  type CloseMode,
  type MonthCloseAllocation,
} from '@/lib/wallet/monthClose'
import { formatMoney, formatPercent } from './format'

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
  color?: string
  currency: CurrencyId
  /** Estimado del mes que se concluye. */
  limit: number
  remaining: number
}

interface DestinationInfo {
  label: string
  Icon: ReturnType<typeof getCategoryIcon>
  color?: string
}

const defaultPlan = (categoryId: string): RowPlan => ({
  mode: 'percent',
  tramos: [{ dest: `cat:${categoryId}`, value: '100' }],
})

function toDestination(dest: string): CloseDestination {
  if (dest.startsWith('cat:')) return { kind: 'category', categoryId: dest.slice(4) }
  if (dest.startsWith('goal:')) return { kind: 'goal', goalId: dest.slice(5) }
  return { kind: 'discard' }
}

function DestinationLabel({ info, note }: { info: DestinationInfo; note?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <info.Icon
        className="size-4 shrink-0"
        style={info.color ? { color: info.color } : undefined}
      />
      <span className="truncate">{info.label}</span>
      {note && <span className="shrink-0 text-[11px] font-semibold text-destructive">{note}</span>}
    </span>
  )
}

const signedColor = (n: number) =>
  n >= 0.005 ? 'text-green-600 dark:text-green-400' : n <= -0.005 ? 'text-destructive' : 'text-foreground'

const formatSigned = (n: number, currency: CurrencyId) => `${n >= 0.005 ? '+' : ''}${formatMoney(n, currency)}`

/** Cómo cambia la deuda de una categoría con lo que este tramo le lleva. */
function DebtChange({
  before,
  after,
  currency,
  className,
}: {
  before: number
  after: number
  currency: CurrencyId
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] tabular-nums text-muted-foreground',
        className
      )}
    >
      <span className={cn('font-semibold', signedColor(before))}>{formatSigned(before, currency)}</span>
      <span aria-hidden>→</span>
      <span className={cn('font-semibold', signedColor(after))}>{formatSigned(after, currency)}</span>
    </p>
  )
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
  const [editing, setEditing] = useState<Set<string>>(new Set())

  const rows = useMemo<Row[]>(() => {
    if (!fromMonth) return []
    return budgetStatusForMonth(rates, fromMonth).map((r) => ({
      categoryId: r.budget.categoryId,
      name: r.categoryName,
      icon: r.categoryIcon,
      color: r.categoryColor,
      currency: r.budget.currency,
      limit: r.limit,
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

  // Arrastre neto (extra − Déficit arrastrado) y estimado que cada categoría ya tiene en
  // el mes nuevo, antes del Reparto del cierre.
  const { baseCarryover, nextLimit } = useMemo(() => {
    const carry = new Map<string, number>()
    const limits = new Map<string, number>()
    for (const b of state.budgets) {
      if (b.templateId !== state.activeBudgetTemplateId || b.month !== toMonth) continue
      carry.set(b.categoryId, parseSigned(b.carryover) - parseAmount(b.carriedDeficit))
      limits.set(b.categoryId, parseAmount(b.limit))
    }
    return { baseCarryover: carry, nextLimit: limits }
  }, [state.budgets, state.activeBudgetTemplateId, toMonth])

  const categories = useMemo(() => budgetableCategories(state.categories), [state.categories])

  // Al abrir, cada fila vuelve a su reparto por defecto (`planOf`). Solo al abrir: si las
  // filas se recalculan con el diálogo abierto, lo editado se conserva.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlans({})
    setEditing(new Set())
  }, [open])

  if (!fromMonth) return null

  const planOf = (r: Row): RowPlan => plans[r.categoryId] ?? defaultPlan(r.categoryId)
  const updatePlan = (categoryId: string, plan: RowPlan) => setPlans((p) => ({ ...p, [categoryId]: plan }))
  const setRowEditing = (categoryId: string, on: boolean) =>
    setEditing((prev) => {
      const next = new Set(prev)
      if (on) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })

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
  const pendingCount = splits.filter((s) => s === null).length

  const allocations: MonthCloseAllocation[] = []
  rows.forEach((r, i) => {
    planOf(r).tramos.forEach((t, j) => {
      const amount = splits[i]?.[j]
      if (!amount) return
      allocations.push({ fromCategoryId: r.categoryId, destination: toDestination(t.dest), amount })
    })
  })
  const projections = projectCarryovers(baseCarryover, allocations)
  const projectedOf = (categoryId: string) =>
    projections.get(categoryId)?.total ?? baseCarryover.get(categoryId) ?? 0
  // Si la categoría aún no tiene presupuesto en el mes nuevo, arranca con el estimado
  // del mes que se concluye (el que se copia al concluir).
  const estimateOf = (categoryId: string) =>
    nextLimit.get(categoryId) ?? rows.find((r) => r.categoryId === categoryId)?.limit ?? 0
  const categoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? rows.find((r) => r.categoryId === categoryId)?.name ?? '—'

  const handleConfirm = () => {
    if (!canConfirm) return
    concludeBudgetMonth(fromMonth, toMonth, allocations)
    onOpenChange(false)
  }

  const toLabel = formatMonthLabel(toMonth)

  const destinationInfo = (r: Row, dest: string): DestinationInfo => {
    if (dest === NONE) return { label: 'Descartar', Icon: CloseIcon }
    if (dest === `cat:${r.categoryId}`) return { label: `Arrastrar a ${toLabel}`, Icon: RefreshIcon }
    if (dest.startsWith('cat:')) {
      const c = categories.find((x) => `cat:${x.id}` === dest)
      return { label: c?.name ?? '—', Icon: getCategoryIcon(c?.icon ?? 'other'), color: c?.color }
    }
    const g = state.goals.find((x) => `goal:${x.id}` === dest)
    return {
      label: g?.name ?? '—',
      Icon: getAccountIcon(g?.icon),
      color: g?.color ?? DEFAULT_ACCOUNT_COLOR,
    }
  }

  const totals = new Map<CurrencyId, { surplus: number; deficit: number }>()
  for (const r of rows) {
    if (isSettled(r.remaining)) continue
    const t = totals.get(r.currency) ?? { surplus: 0, deficit: 0 }
    if (r.remaining > 0) t.surplus += r.remaining
    else t.deficit += r.remaining
    totals.set(r.currency, t)
  }

  const indexed = rows.map((r, i) => ({ r, i }))
  const pending = indexed.filter(({ r }) => !isSettled(r.remaining))
  const settled = rows.filter((r) => isSettled(r.remaining))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Concluir {formatMonthLabel(fromMonth)}</DialogTitle>
          <DialogDescription>
            Los estimados pasan a {toLabel}. Elige qué hacer con lo que sobró o faltó en cada
            presupuesto; por defecto se arrastra al mes siguiente.
          </DialogDescription>
        </DialogHeader>

        {totals.size > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {[...totals].map(([currency, t]) => {
              const net = round2(t.surplus + t.deficit)
              return (
                <div key={currency} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Sobrante total</span>
                    <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                      +{formatMoney(t.surplus, currency)}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Déficit total</span>
                    <span className="text-sm font-bold tabular-nums text-destructive">
                      {formatMoney(t.deficit, currency)}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col rounded-lg bg-muted/40 px-3 py-2 sm:col-span-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Diferencial total</span>
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        net > 0
                          ? 'text-green-600 dark:text-green-400'
                          : net < 0
                            ? 'text-destructive'
                            : 'text-foreground'
                      )}
                    >
                      {net > 0 ? '+' : ''}
                      {formatMoney(net, currency)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-3">
          {pending.map(({ r, i }) => {
            const Icon = getCategoryIcon(r.icon)
            const negative = r.remaining < 0
            const plan = planOf(r)
            const split = splits[i]
            const values = plan.tramos.map((t) => parseAmount(t.value))
            const gap = remainderGap(r.remaining, plan.mode, values)
            const target = plan.mode === 'percent' ? 100 : Math.abs(r.remaining)
            const assigned = values.reduce((a, b) => a + b, 0)
            const over = assigned - target >= 0.005
            const isEditing = editing.has(r.categoryId) || !split
            const suffix = plan.mode === 'percent' ? '%' : getCurrency(r.currency).symbol
            const acceptsCurrency = (categoryId: string) => {
              const fixed = budgetCurrency.get(categoryId)
              if (fixed) return fixed === r.currency
              const claimed = newCategoryCurrencies.get(`cat:${categoryId}`)
              return !claimed || [...claimed].every((c) => c === r.currency)
            }
            const formatGap = (n: number) =>
              plan.mode === 'percent' ? formatPercent(n / 100, 2) : formatMoney(n, r.currency)
            const problem = split
              ? null
              : mixesCurrencies(plan)
                ? 'Una categoría nueva no puede recibir dinero de dos monedas'
                : values.some((v) => v <= 0)
                  ? 'Cada destino necesita una cantidad'
                  : Math.abs(gap) >= 0.005
                    ? `${gap > 0 ? 'Falta asignar' : 'Sobran'} ${formatGap(Math.abs(gap))}`
                    : 'El último destino se queda sin monto: ajusta las cantidades'
            const otherCategories = categories.filter(
              (c) => c.id !== r.categoryId && acceptsCurrency(c.id)
            )
            const goals = negative ? [] : state.goals.filter((g) => !g.completedAt && g.currency === r.currency)

            // Al cambiar de modo el último tramo se queda con lo que falte, para que un
            // reparto que cuadraba siga cuadrando pese al redondeo.
            const setMode = (mode: CloseMode) => {
              if (mode === plan.mode) return
              const total = Math.abs(r.remaining)
              const modeTarget = mode === 'amount' ? total : 100
              const converted = values.map((v) =>
                round2(mode === 'amount' ? (total * v) / 100 : total > 0 ? (v / total) * 100 : 0)
              )
              if (split) {
                const others = converted.slice(0, -1).reduce((a, b) => a + b, 0)
                converted[converted.length - 1] = round2(modeTarget - others)
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

            // Lo que un tramo hacia otra categoría le hace a su deuda, con todos los
            // demás tramos que también le llegan ya contados.
            const debtChange = (t: Tramo, j: number, className?: string) => {
              const amount = split?.[j]
              if (!amount || !t.dest.startsWith('cat:') || t.dest === `cat:${r.categoryId}`) return null
              const id = t.dest.slice(4)
              const after = projectedOf(id)
              const before = round2(after - amount)
              if (before > -0.005 && after > -0.005) return null
              const estimate = estimateOf(id)
              return (
                <DebtChange
                  before={round2(estimate + before)}
                  after={round2(estimate + after)}
                  currency={r.currency}
                  className={className}
                />
              )
            }
            const owedNote = (categoryId: string) => {
              const owed = projectedOf(categoryId)
              return owed <= -0.005 ? `Debe ${formatMoney(-owed, r.currency)}` : undefined
            }

            const projection = projections.get(r.categoryId)
            const incoming = new Map<string, number>()
            let own = projection?.base ?? baseCarryover.get(r.categoryId) ?? 0
            for (const f of projection?.flows ?? []) {
              if (f.fromCategoryId === r.categoryId) own += f.amount
              else incoming.set(f.fromCategoryId, (incoming.get(f.fromCategoryId) ?? 0) + f.amount)
            }
            own = round2(own)
            const finalCarry = projectedOf(r.categoryId)
            const nextEstimate = estimateOf(r.categoryId)
            const available = round2(nextEstimate + finalCarry)
            const canBeCovered =
              negative &&
              incoming.size === 0 &&
              rows.some((o) => o.currency === r.currency && o.remaining >= 0.005)

            return (
              <div
                key={r.categoryId}
                className={cn(
                  '@container flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 transition-shadow',
                  problem ? 'ring-destructive/40' : 'ring-foreground/10'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-bold leading-5">
                    <Icon
                      className="size-4 shrink-0"
                      style={r.color ? { color: r.color } : undefined}
                    />
                    <span className="truncate">{r.name}</span>
                  </span>
                  <div className="flex shrink-0 flex-col items-end">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                        negative
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-green-500/10 text-green-600 dark:text-green-400'
                      )}
                    >
                      {negative ? '' : '+'}
                      {formatMoney(r.remaining, r.currency)}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {negative ? 'Déficit' : 'Sobrante'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/70 p-3 text-xs tabular-nums">
                  <span className="font-semibold text-muted-foreground">Así queda en {toLabel}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Estimado</span>
                    <span className="font-semibold">{formatMoney(nextEstimate, r.currency)}</span>
                  </div>
                  {Math.abs(own) >= 0.005 && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{own < 0 ? 'Déficit propio' : 'Arrastre propio'}</span>
                      <span className={cn('font-semibold', signedColor(own))}>{formatSigned(own, r.currency)}</span>
                    </div>
                  )}
                  {[...incoming].map(([fromId, amount]) => {
                    const from = rows.find((x) => x.categoryId === fromId)
                    const FromIcon = getCategoryIcon(from?.icon ?? 'other')
                    return (
                      <div key={fromId} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                          <FromIcon
                            className="size-3.5 shrink-0"
                            style={from?.color ? { color: from.color } : undefined}
                          />
                          <span className="truncate">De {categoryName(fromId)}</span>
                        </span>
                        <span className={cn('shrink-0 font-semibold', signedColor(amount))}>
                          {formatSigned(amount, r.currency)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="h-px bg-border/60" />
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span>Disponible</span>
                    <span className={signedColor(available)}>{formatSigned(available, r.currency)}</span>
                  </div>
                  {finalCarry <= -0.005 && (
                    <span className="text-[11px] text-muted-foreground">
                      Arranca con {formatMoney(-finalCarry, r.currency)} ya utilizado por el déficit.
                    </span>
                  )}
                  {finalCarry >= 0.005 && (
                    <span className="text-[11px] text-muted-foreground">
                      Va al extra: {formatSigned(finalCarry, r.currency)}.
                    </span>
                  )}
                </div>

                {canBeCovered && (
                  <p className="text-[11px] text-muted-foreground">
                    Puedes cubrir este déficit enviándole sobrante de otra categoría.
                  </p>
                )}

                {!isEditing ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 py-1.5 pl-3 pr-1.5">
                    <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                      {plan.tramos.map((t, j) => (
                        <li key={j} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <DestinationLabel info={destinationInfo(r, t.dest)} />
                            {plan.tramos.length > 1 && (
                              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {formatMoney(split?.[j] ?? 0, r.currency)}
                              </span>
                            )}
                          </div>
                          {debtChange(t, j, 'pl-6')}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setRowEditing(r.categoryId, true)}
                      aria-label={`Cambiar reparto de ${r.name}`}
                    >
                      <PencilIcon className="size-3.5" /> Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Repartir por</span>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-background/60 p-1">
                        {(
                          [
                            { id: 'percent', label: '%', name: 'Porcentaje' },
                            { id: 'amount', label: getCurrency(r.currency).symbol, name: 'Monto' },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setMode(o.id)}
                            aria-label={o.name}
                            aria-pressed={plan.mode === o.id}
                            className={cn(
                              'min-w-9 rounded-md px-2.5 py-1 text-xs font-bold transition-all',
                              plan.mode === o.id
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {plan.tramos.map((t, j) => (
                      <div key={j} className="flex flex-col gap-1">
                      <div className="flex flex-col gap-1.5 @sm:flex-row @sm:items-start @sm:gap-2">
                        <div className="min-w-0 @sm:flex-1">
                          <Select value={t.dest} onValueChange={(v) => setTramo(j, { dest: v as string })}>
                            <SelectTrigger className="w-full bg-card">
                              <SelectValue>
                                {(val) => <DestinationLabel info={destinationInfo(r, String(val))} />}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={`cat:${r.categoryId}`}>
                                <DestinationLabel info={destinationInfo(r, `cat:${r.categoryId}`)} />
                              </SelectItem>
                              {otherCategories.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Pasar a otra categoría</SelectLabel>
                                  {otherCategories.map((c) => (
                                    <SelectItem key={c.id} value={`cat:${c.id}`}>
                                      <DestinationLabel info={destinationInfo(r, `cat:${c.id}`)} note={owedNote(c.id)} />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {goals.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Enviar a un plan de ahorro</SelectLabel>
                                  {goals.map((g) => (
                                    <SelectItem key={g.id} value={`goal:${g.id}`}>
                                      <DestinationLabel info={destinationInfo(r, `goal:${g.id}`)} />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              <SelectGroup>
                                <SelectLabel>Otro</SelectLabel>
                                <SelectItem value={NONE}>
                                  <DestinationLabel info={destinationInfo(r, NONE)} />
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-start gap-1">
                          <div className="flex flex-1 flex-col items-end gap-0.5 @sm:w-32 @sm:flex-none">
                            <div className="relative w-full">
                              <Input
                                aria-label={`Destino ${j + 1} de ${r.name}`}
                                inputMode="decimal"
                                value={t.value}
                                onChange={(e) => setTramo(j, { value: e.target.value })}
                                className="bg-card pr-10 text-right tabular-nums"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">
                                {suffix}
                              </span>
                            </div>
                            {plan.mode === 'percent' && split && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {formatMoney(split?.[j] ?? 0, r.currency)}
                              </span>
                            )}
                          </div>
                          {plan.tramos.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="mt-1 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTramo(j)}
                              aria-label={`Quitar destino ${j + 1} de ${r.name}`}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {debtChange(t, j)}
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={addTramo}
                      aria-label={`Agregar destino a ${r.name}`}
                    >
                      <PlusIcon className="size-4" /> Agregar destino
                    </Button>

                    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            !problem ? 'bg-green-500' : over ? 'bg-destructive' : 'bg-amber-500'
                          )}
                          style={{ width: `${target > 0 ? Math.min(1, assigned / target) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex min-h-8 items-center justify-between gap-2 text-xs">
                        {problem ? (
                          <span className="flex items-center gap-1.5 font-semibold text-destructive tabular-nums">
                            <AlertIcon className="size-3.5 shrink-0" />
                            {problem}
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">
                              <CheckIcon className="size-3.5 shrink-0" />
                              Todo repartido
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setRowEditing(r.categoryId, false)}
                            >
                              Listo
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {settled.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="font-semibold">Sin sobrante ni déficit:</span>
            {settled.map((r) => {
              const Icon = getCategoryIcon(r.icon)
              return (
                <span key={r.categoryId} className="flex items-center gap-1">
                  <Icon
                    className="size-3.5 shrink-0"
                    style={r.color ? { color: r.color } : undefined}
                  />
                  {r.name}
                </span>
              )
            })}
          </div>
        )}

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay presupuestos en {formatMonthLabel(fromMonth)}.
          </p>
        )}

        <DialogFooter className="sm:items-center">
          {rows.length > 0 && (
            <span
              className={cn(
                'order-last text-center text-xs font-semibold sm:order-first sm:mr-auto sm:text-left',
                canConfirm ? 'text-muted-foreground' : 'text-destructive'
              )}
            >
              {canConfirm
                ? 'Todo listo para concluir'
                : `${pendingCount} ${pendingCount === 1 ? 'categoría necesita' : 'categorías necesitan'} revisión`}
            </span>
          )}
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
