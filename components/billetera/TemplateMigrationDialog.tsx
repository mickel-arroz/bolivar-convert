'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { WalletApi, BudgetTransferInput, formatMonthLabel } from '@/hooks/useWallet'
import { getCategoryIcon } from '@/constants/walletCategories'
import { parseAmount, normalize } from '@/lib/wallet/compute'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

interface TemplateMigrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  rates: Rates
  /** Plantilla que se va a activar (destinos). Los orígenes son la plantilla activa. */
  toTemplateId: string
  month: string
}

type AllocMode = 'percent' | 'fixed'
interface Alloc {
  id: string
  destCategoryId: string
  mode: AllocMode
  value: string
}

const EPS = 0.005
let allocSeq = 0
const nextAllocId = () => `a${allocSeq++}`

export function TemplateMigrationDialog({
  open,
  onOpenChange,
  wallet,
  rates,
  toTemplateId,
  month
}: TemplateMigrationDialogProps) {
  const { state, budgetStatusForMonth, applyBudgetTemplate } = wallet
  const [allocs, setAllocs] = useState<Record<string, Alloc[]>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )

  const toTemplate = state.budgetTemplates.find((t) => t.id === toTemplateId)

  const sources = useMemo(() => {
    if (!open) return []
    return budgetStatusForMonth(rates, month)
      .map((r) => ({
        categoryId: r.budget.categoryId,
        name: r.categoryName,
        icon: r.categoryIcon,
        color: r.categoryColor,
        currency: r.budget.currency,
        extra: r.carryover,
        spent: r.actual,
        transferable: r.carryover - r.actual
      }))
      .filter((s) => Math.abs(s.transferable) > EPS)
  }, [open, rates, month, budgetStatusForMonth])

  const destinations = useMemo(
    () =>
      state.budgets
        .filter((b) => b.templateId === toTemplateId && b.month === month)
        .map((b) => ({
          categoryId: b.categoryId,
          name: categoryById.get(b.categoryId)?.name ?? '—',
          currency: b.currency
        })),
    [state.budgets, toTemplateId, month, categoryById]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setAllocs({})
  }, [open])

  const allocAmount = (transferable: number, a: Alloc): number => {
    const v = parseAmount(a.value)
    if (v <= 0) return 0
    return a.mode === 'percent'
      ? (transferable * v) / 100
      : Math.sign(transferable) * v
  }

  const allocFraction = (transferable: number, a: Alloc): number => {
    const v = parseAmount(a.value)
    if (v <= 0) return 0
    return a.mode === 'percent' ? v / 100 : v / Math.abs(transferable)
  }

  const sumFor = (sourceCategoryId: string, transferable: number) =>
    (allocs[sourceCategoryId] ?? []).reduce(
      (acc, a) => acc + allocAmount(transferable, a),
      0
    )

  const isOver = (transferable: number, sum: number) =>
    Math.abs(sum) > Math.abs(transferable) + EPS
  const anyOver = sources.some((s) =>
    isOver(s.transferable, sumFor(s.categoryId, s.transferable))
  )

  const pendingSources = sources.filter(
    (s) => Math.abs(s.transferable - sumFor(s.categoryId, s.transferable)) > EPS
  )

  const setSourceAllocs = (
    categoryId: string,
    updater: (prev: Alloc[]) => Alloc[]
  ) =>
    setAllocs((prev) => ({
      ...prev,
      [categoryId]: updater(prev[categoryId] ?? [])
    }))

  const addAlloc = (categoryId: string) =>
    setSourceAllocs(categoryId, (prev) => [
      ...prev,
      {
        id: nextAllocId(),
        destCategoryId: destinations[0]?.categoryId ?? '',
        mode: 'percent',
        value: ''
      }
    ])

  const updateAlloc = (categoryId: string, id: string, patch: Partial<Alloc>) =>
    setSourceAllocs(categoryId, (prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    )

  const removeAlloc = (categoryId: string, id: string) =>
    setSourceAllocs(categoryId, (prev) => prev.filter((a) => a.id !== id))

  const handleApplyClick = () => {
    if (pendingSources.length > 0) {
      setConfirmOpen(true)
      return
    }
    handleApply()
  }

  const handleApply = () => {
    setConfirmOpen(false)
    const transfers: BudgetTransferInput[] = []
    for (const source of sources) {
      for (const a of allocs[source.categoryId] ?? []) {
        if (!a.destCategoryId) continue
        const f = allocFraction(source.transferable, a)
        if (f <= 0) continue
        const dest = destinations.find((d) => d.categoryId === a.destCategoryId)
        if (!dest) continue
        const toDest = (amount: number) =>
          normalize(amount, source.currency, dest.currency, rates, state.statsRateSource)
        transfers.push({
          fromCategoryId: source.categoryId,
          toCategoryId: dest.categoryId,
          extra: toDest(source.extra * f),
          spent: toDest(source.spent * f),
          currency: dest.currency
        })
      }
    }
    applyBudgetTemplate(toTemplateId, month, transfers)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Activar «{toTemplate?.name ?? 'plantilla'}»
            </DialogTitle>
            <DialogDescription>
              Reparte el extra y el gasto ya consumido de cada categoría de{' '}
              {formatMonthLabel(month)} hacia las categorías de la nueva
              plantilla (por % o monto fijo). Lo que no asignes se descarta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {sources.length === 0 && (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center text-sm text-muted-foreground">
                No hay saldos que migrar. Se activará la plantilla directamente.
              </p>
            )}

            {sources.map((source) => {
              const Icon = getCategoryIcon(source.icon)
              const list = allocs[source.categoryId] ?? []
              const sum = sumFor(source.categoryId, source.transferable)
              const over = isOver(source.transferable, sum)
              const unassigned = source.transferable - sum
              const negative = source.transferable < 0
              return (
                <div
                  key={source.categoryId}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                      <Icon
                        className="size-4 shrink-0"
                        style={
                          source.color ? { color: source.color } : undefined
                        }
                      />
                      <span className="truncate">{source.name}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-bold tabular-nums',
                        negative
                          ? 'text-destructive'
                          : 'text-green-600 dark:text-green-500'
                      )}
                    >
                      {source.transferable > 0 ? '+' : ''}
                      {formatMoney(source.transferable, source.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Extra: {formatMoney(source.extra, source.currency)} · Gastado:{' '}
                    {formatMoney(source.spent, source.currency)}
                  </p>

                  {list.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <Select
                          value={a.destCategoryId}
                          onValueChange={(v) =>
                            updateAlloc(source.categoryId, a.id, {
                              destCategoryId: v as string
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {(val) =>
                                destinations.find((d) => d.categoryId === val)
                                  ?.name ?? 'Destino'
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {destinations.map((d) => (
                              <SelectItem
                                key={d.categoryId}
                                value={d.categoryId}
                              >
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
                        {(['percent', 'fixed'] as AllocMode[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              updateAlloc(source.categoryId, a.id, { mode: m })
                            }
                            className={cn(
                              'rounded-md px-2.5 py-1 text-xs font-bold transition-all',
                              a.mode === m
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {m === 'percent' ? '%' : 'Monto'}
                          </button>
                        ))}
                      </div>
                      <Input
                        value={a.value}
                        onChange={(e) =>
                          updateAlloc(source.categoryId, a.id, {
                            value: e.target.value
                          })
                        }
                        inputMode="decimal"
                        placeholder={a.mode === 'percent' ? '0' : '0,00'}
                        className="w-20 shrink-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeAlloc(source.categoryId, a.id)}
                        aria-label="Quitar destino"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAlloc(source.categoryId)}
                      disabled={destinations.length === 0}
                    >
                      <PlusIcon className="size-4" /> Agregar destino
                    </Button>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        over
                          ? 'font-bold text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {over
                        ? 'Excede lo disponible'
                        : `Sin asignar: ${formatMoney(unassigned, source.currency)}`}
                    </span>
                  </div>
                </div>
              )
            })}

            {destinations.length === 0 && sources.length > 0 && (
              <p className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                La plantilla a activar no tiene presupuestos este mes, así que
                no hay destinos: los saldos se descartarán.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyClick} disabled={anyOver}>
              Aplicar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Montos sin asignar</AlertDialogTitle>
            <AlertDialogDescription>
              Estas categorías aún tienen saldo sin destino. Si continúas, esos
              montos no se traspasarán a ninguna categoría de la nueva
              plantilla: se eliminarán por completo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            {pendingSources.map((source) => {
              const Icon = getCategoryIcon(source.icon)
              const unassigned =
                source.transferable -
                sumFor(source.categoryId, source.transferable)
              return (
                <div
                  key={source.categoryId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <Icon
                      className="size-4 shrink-0"
                      style={source.color ? { color: source.color } : undefined}
                    />
                    <span className="truncate">{source.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-destructive">
                    {formatMoney(unassigned, source.currency)}
                  </span>
                </div>
              )
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
