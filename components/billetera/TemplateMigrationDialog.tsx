'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { WalletApi, formatMonthLabel } from '@/hooks/useWallet'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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
  month,
}: TemplateMigrationDialogProps) {
  const { state, budgetStatusForMonth, applyBudgetTemplate } = wallet
  const [allocs, setAllocs] = useState<Record<string, Alloc[]>>({})

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
        remaining: r.effectiveLimit - r.actual,
      }))
      .filter((s) => Math.abs(s.remaining) > EPS)
  }, [open, rates, month, budgetStatusForMonth])

  const destinations = useMemo(
    () =>
      state.budgets
        .filter((b) => b.templateId === toTemplateId && b.month === month)
        .map((b) => ({
          categoryId: b.categoryId,
          name: categoryById.get(b.categoryId)?.name ?? '—',
          currency: b.currency,
        })),
    [state.budgets, toTemplateId, month, categoryById]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setAllocs({})
  }, [open])

  const allocAmount = (remaining: number, a: Alloc): number => {
    const v = parseAmount(a.value)
    if (v <= 0) return 0
    return a.mode === 'percent' ? (remaining * v) / 100 : Math.sign(remaining) * v
  }

  const sumFor = (sourceCategoryId: string, remaining: number) =>
    (allocs[sourceCategoryId] ?? []).reduce((acc, a) => acc + allocAmount(remaining, a), 0)

  const isOver = (remaining: number, sum: number) => Math.abs(sum) > Math.abs(remaining) + EPS
  const anyOver = sources.some((s) => isOver(s.remaining, sumFor(s.categoryId, s.remaining)))

  const setSourceAllocs = (categoryId: string, updater: (prev: Alloc[]) => Alloc[]) =>
    setAllocs((prev) => ({ ...prev, [categoryId]: updater(prev[categoryId] ?? []) }))

  const addAlloc = (categoryId: string) =>
    setSourceAllocs(categoryId, (prev) => [
      ...prev,
      { id: nextAllocId(), destCategoryId: destinations[0]?.categoryId ?? '', mode: 'percent', value: '' },
    ])

  const updateAlloc = (categoryId: string, id: string, patch: Partial<Alloc>) =>
    setSourceAllocs(categoryId, (prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const removeAlloc = (categoryId: string, id: string) =>
    setSourceAllocs(categoryId, (prev) => prev.filter((a) => a.id !== id))

  const handleApply = () => {
    const acc: Record<string, number> = {}
    for (const source of sources) {
      for (const a of allocs[source.categoryId] ?? []) {
        if (!a.destCategoryId) continue
        const amtSrc = allocAmount(source.remaining, a)
        if (!amtSrc) continue
        const dest = destinations.find((d) => d.categoryId === a.destCategoryId)
        if (!dest) continue
        const converted = normalize(amtSrc, source.currency, dest.currency, rates, state.statsRateSource)
        acc[dest.categoryId] = (acc[dest.categoryId] ?? 0) + converted
      }
    }
    const carryoverByCategory: Record<string, string> = {}
    for (const [k, v] of Object.entries(acc)) carryoverByCategory[k] = String(v)
    applyBudgetTemplate(toTemplateId, month, carryoverByCategory)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activar «{toTemplate?.name ?? 'plantilla'}»</DialogTitle>
          <DialogDescription>
            Reparte el saldo o déficit de cada categoría de {formatMonthLabel(month)} hacia las
            categorías de la nueva plantilla (por % o monto fijo). Lo que no asignes se descarta.
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
            const sum = sumFor(source.categoryId, source.remaining)
            const over = isOver(source.remaining, sum)
            const unassigned = source.remaining - sum
            const negative = source.remaining < 0
            return (
              <div
                key={source.categoryId}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <Icon
                      className="size-4 shrink-0"
                      style={source.color ? { color: source.color } : undefined}
                    />
                    <span className="truncate">{source.name}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-bold tabular-nums',
                      negative ? 'text-destructive' : 'text-green-600 dark:text-green-500'
                    )}
                  >
                    {source.remaining > 0 ? '+' : ''}
                    {formatMoney(source.remaining, source.currency)}
                  </span>
                </div>

                {list.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={a.destCategoryId}
                        onValueChange={(v) =>
                          updateAlloc(source.categoryId, a.id, { destCategoryId: v as string })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {(val) => destinations.find((d) => d.categoryId === val)?.name ?? 'Destino'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {destinations.map((d) => (
                            <SelectItem key={d.categoryId} value={d.categoryId}>
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
                          onClick={() => updateAlloc(source.categoryId, a.id, { mode: m })}
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
                      onChange={(e) => updateAlloc(source.categoryId, a.id, { value: e.target.value })}
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
                      over ? 'font-bold text-destructive' : 'text-muted-foreground'
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
              La plantilla a activar no tiene presupuestos este mes, así que no hay destinos: los
              saldos se descartarán.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={anyOver}>
            Aplicar plantilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
