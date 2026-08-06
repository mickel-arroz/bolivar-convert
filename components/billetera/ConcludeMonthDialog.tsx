'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { WalletApi, formatMonthLabel } from '@/hooks/useWallet'
import { getCategoryIcon } from '@/constants/walletCategories'
import { Button } from '@/components/ui/button'
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
import { formatMoney, todayInputValue } from './format'

interface ConcludeMonthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  rates: Rates
  fromMonth: string | null
  toMonth: string
}

/** Destino del extra de cada categoría: próximo mes, descartar, o una meta ('goal:<id>'). */
const NEXT = 'next'
const NONE = 'none'

export function ConcludeMonthDialog({
  open,
  onOpenChange,
  wallet,
  rates,
  fromMonth,
  toMonth,
}: ConcludeMonthDialogProps) {
  const { state, budgetStatusForMonth, concludeBudgetMonth, allocateExtraToGoal } = wallet
  const [dest, setDest] = useState<Record<string, string>>({})

  const rows = useMemo(() => {
    if (!fromMonth) return []
    return budgetStatusForMonth(rates, fromMonth).map((r) => ({
      categoryId: r.budget.categoryId,
      name: r.categoryName,
      icon: r.categoryIcon,
      currency: r.budget.currency,
      remaining: r.effectiveLimit - r.actual,
    }))
  }, [fromMonth, rates, budgetStatusForMonth])

  // Por defecto, todas arrastran su sobrante al próximo mes.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDest(Object.fromEntries(rows.map((r) => [r.categoryId, NEXT])))
    }
  }, [open, rows])

  if (!fromMonth) return null

  const handleConfirm = () => {
    const today = todayInputValue()
    const carryovers: Record<string, number> = {}
    for (const r of rows) {
      const choice = dest[r.categoryId] ?? NEXT
      if (choice === NEXT) {
        carryovers[r.categoryId] = r.remaining
      } else if (choice.startsWith('goal:') && r.remaining > 0) {
        allocateExtraToGoal(choice.slice(5), r.remaining, today)
      }
      // NONE: no se arrastra ni se asigna.
    }
    concludeBudgetMonth(fromMonth, toMonth, carryovers)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir {formatMonthLabel(fromMonth)}</DialogTitle>
          <DialogDescription>
            El estimado de cada categoría pasa a {formatMonthLabel(toMonth)}. Decide qué hacer con el
            sobrante o déficit de cada una.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const Icon = getCategoryIcon(r.icon)
            const negative = r.remaining < 0
            // Metas elegibles: misma moneda que el presupuesto y solo si hay sobrante positivo.
            const goalOptions =
              r.remaining > 0 ? state.goals.filter((g) => g.currency === r.currency) : []
            return (
              <div
                key={r.categoryId}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
                <div className="sm:w-48">
                  <Select
                    value={dest[r.categoryId] ?? NEXT}
                    onValueChange={(v) => setDest((prev) => ({ ...prev, [r.categoryId]: v as string }))}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(val) => {
                          if (val === NONE) return 'Descartar'
                          if (typeof val === 'string' && val.startsWith('goal:')) {
                            const g = goalOptions.find((x) => `goal:${x.id}` === val)
                            return g ? `Enviar a: ${g.name}` : 'Arrastrar al próximo mes'
                          }
                          return 'Arrastrar al próximo mes'
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEXT}>Arrastrar al próximo mes</SelectItem>
                      {goalOptions.map((g) => (
                        <SelectItem key={g.id} value={`goal:${g.id}`}>
                          Enviar a: {g.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NONE}>Descartar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          <Button onClick={handleConfirm}>Concluir mes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
