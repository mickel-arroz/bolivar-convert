'use client'

import { useEffect, useMemo, useState } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { WalletApi, monthKey, formatMonthLabel } from '@/hooks/useWallet'
import { getCategoryIcon, CATEGORY_ICON_MAP } from '@/constants/walletCategories'
import { DotsIcon } from '@/components/icons'
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
import { Field, AmountField, CurrencyToggle } from './fields'
import { notify } from '@/lib/notify'

interface BudgetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  /** Categoría preseleccionada (al editar un presupuesto existente). */
  presetCategoryId?: string | null
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  wallet,
  presetCategoryId,
}: BudgetFormDialogProps) {
  const { state, setBudget } = wallet
  const month = useMemo(() => monthKey(new Date()), [])
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [carryover, setCarryover] = useState('')
  const [currency, setCurrency] = useState<CurrencyId>(state.displayCurrency)

  const expenseCategories = useMemo(
    () => state.categories.filter((c) => c.kind === 'expense'),
    [state.categories]
  )

  useEffect(() => {
    if (open) {
      const cat = presetCategoryId ?? expenseCategories[0]?.id ?? ''
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId(cat)
      const existing = state.budgets.find((b) => b.categoryId === cat && b.month === month)
      setLimit(existing?.limit ?? '')
      setCarryover(existing?.carryover ?? '')
      setCurrency(existing?.currency ?? state.displayCurrency)
    }
  }, [open, presetCategoryId, expenseCategories, state.budgets, state.displayCurrency, month])

  // Al cambiar de categoría, precargar su presupuesto del mes si existe
  useEffect(() => {
    if (!open) return
    const existing = state.budgets.find((b) => b.categoryId === categoryId && b.month === month)
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLimit(existing.limit)
      setCarryover(existing.carryover ?? '')
      setCurrency(existing.currency)
    }
  }, [categoryId, open, state.budgets, month])

  // Validación: no permitir un presupuesto cuyo título (nombre de categoría) ya
  // exista en otro presupuesto del mismo mes.
  const duplicateTitle = useMemo(() => {
    const name = state.categories.find((c) => c.id === categoryId)?.name.trim().toLowerCase()
    if (!name) return false
    return state.budgets.some((b) => {
      if (b.month !== month || b.categoryId === categoryId) return false
      const otherName = state.categories.find((c) => c.id === b.categoryId)?.name.trim().toLowerCase()
      return otherName === name
    })
  }, [state.categories, state.budgets, categoryId, month])

  const canSubmit = !!categoryId && parseFloat(limit.replace(',', '.')) > 0 && !duplicateTitle

  const handleSubmit = () => {
    if (!canSubmit) return
    setBudget(categoryId, month, limit, currency, carryover.trim() === '' ? '0' : carryover)
    notify.success('Presupuesto guardado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Presupuesto mensual</DialogTitle>
          <DialogDescription>
            Asigna un gasto estimado para una categoría en {formatMonthLabel(month)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Categoría">
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
              <SelectTrigger>
                <SelectValue>
                  {(val) => {
                    const c = expenseCategories.find((x) => x.id === val)
                    if (!c) return <span className="text-muted-foreground">Selecciona una categoría</span>
                    const Icon = CATEGORY_ICON_MAP[c.icon] ?? DotsIcon
                    return (
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" style={c.color ? { color: c.color } : undefined} />
                        {c.name}
                      </span>
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => {
                  const Icon = getCategoryIcon(c.icon)
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <Icon className="size-4" style={c.color ? { color: c.color } : undefined} />
                      {c.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {duplicateTitle && (
              <span className="text-xs text-destructive">
                Ya existe un presupuesto con ese título este mes.
              </span>
            )}
          </Field>

          <Field label="Moneda del presupuesto">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </Field>

          <AmountField
            label="Límite estimado"
            value={limit}
            onValueChange={setLimit}
            autoFocus
          />

          <AmountField
            label="Extra"
            hint="Sobrante o déficit arrastrado. Por defecto 0; puedes ajustarlo (admite negativos)."
            value={carryover}
            onValueChange={setCarryover}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Guardar presupuesto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
