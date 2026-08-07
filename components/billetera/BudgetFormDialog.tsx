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

/** Presupuesto en borrador (sin persistir) para la vista de lista de una plantilla. */
export interface BudgetDraftItem {
  categoryId: string
  limit: string
  currency: CurrencyId
}

interface BudgetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  /** Categoría preseleccionada (al editar un presupuesto existente). */
  presetCategoryId?: string | null
  /**
   * Modo "item de plantilla": en vez de persistir con `setBudget`, devuelve el
   * presupuesto en borrador (sin "extra") para acumularlo en la modal de plantilla.
   */
  asItem?: {
    editing?: BudgetDraftItem | null
    /** Categorías ya presentes en la plantilla en curso (para evitar duplicados). */
    existingCategoryIds: string[]
    onSubmit: (item: BudgetDraftItem) => void
  }
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  wallet,
  presetCategoryId,
  asItem,
}: BudgetFormDialogProps) {
  const { state, setBudget } = wallet
  const month = useMemo(() => monthKey(new Date()), [])
  const activeTemplateId = state.activeBudgetTemplateId
  const isItemMode = !!asItem
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [carryover, setCarryover] = useState('')
  const [currency, setCurrency] = useState<CurrencyId>(state.displayCurrency)

  const expenseCategories = useMemo(
    () => state.categories.filter((c) => c.kind === 'expense'),
    [state.categories]
  )

  const selectableCategories = useMemo(() => {
    if (!asItem) return expenseCategories
    const taken = new Set(asItem.existingCategoryIds)
    const editingId = asItem.editing?.categoryId
    return expenseCategories.filter((c) => c.id === editingId || !taken.has(c.id))
  }, [expenseCategories, asItem])

  useEffect(() => {
    if (!open) return
    if (asItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId(asItem.editing?.categoryId ?? presetCategoryId ?? selectableCategories[0]?.id ?? '')
      setLimit(asItem.editing?.limit ?? '')
      setCurrency(asItem.editing?.currency ?? state.displayCurrency)
      setCarryover('')
      return
    }
    const cat = presetCategoryId ?? expenseCategories[0]?.id ?? ''
    setCategoryId(cat)
    const existing = state.budgets.find(
      (b) => b.templateId === activeTemplateId && b.categoryId === cat && b.month === month
    )
    setLimit(existing?.limit ?? '')
    setCarryover(existing?.carryover ?? '')
    setCurrency(existing?.currency ?? state.displayCurrency)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetCategoryId, expenseCategories, state.budgets, state.displayCurrency, month, activeTemplateId])

  // Al cambiar de categoría en modo normal, precargar su presupuesto del mes si existe.
  useEffect(() => {
    if (!open || isItemMode) return
    const existing = state.budgets.find(
      (b) => b.templateId === activeTemplateId && b.categoryId === categoryId && b.month === month
    )
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLimit(existing.limit)
      setCarryover(existing.carryover ?? '')
      setCurrency(existing.currency)
    }
  }, [categoryId, open, isItemMode, state.budgets, month, activeTemplateId])

  // Validación: título (nombre de categoría) no repetido en el mismo ámbito.
  const duplicateTitle = useMemo(() => {
    const name = state.categories.find((c) => c.id === categoryId)?.name.trim().toLowerCase()
    if (!name) return false
    if (asItem) {
      return asItem.existingCategoryIds.some((otherId) => {
        if (otherId === categoryId) return false
        const otherName = state.categories.find((c) => c.id === otherId)?.name.trim().toLowerCase()
        return otherName === name
      })
    }
    return state.budgets.some((b) => {
      if (b.templateId !== activeTemplateId || b.month !== month || b.categoryId === categoryId)
        return false
      const otherName = state.categories.find((c) => c.id === b.categoryId)?.name.trim().toLowerCase()
      return otherName === name
    })
  }, [state.categories, state.budgets, categoryId, month, activeTemplateId, asItem])

  const canSubmit = !!categoryId && parseFloat(limit.replace(',', '.')) > 0 && !duplicateTitle

  const handleSubmit = () => {
    if (!canSubmit) return
    if (asItem) {
      asItem.onSubmit({ categoryId, limit, currency })
      onOpenChange(false)
      return
    }
    setBudget(categoryId, month, limit, currency, carryover.trim() === '' ? '0' : carryover)
    notify.success('Presupuesto guardado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Presupuesto {isItemMode ? 'de la plantilla' : 'mensual'}</DialogTitle>
          <DialogDescription>
            {isItemMode
              ? 'Asigna un gasto estimado por categoría para esta plantilla.'
              : `Asigna un gasto estimado para una categoría en ${formatMonthLabel(month)}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Categoría">
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
              <SelectTrigger>
                <SelectValue>
                  {(val) => {
                    const c = selectableCategories.find((x) => x.id === val)
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
                {selectableCategories.map((c) => {
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
                Ya existe un presupuesto con ese título en {isItemMode ? 'la plantilla' : 'este mes'}.
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

          {!isItemMode && (
            <AmountField
              label="Extra"
              hint="Sobrante o déficit arrastrado. Por defecto 0; puedes ajustarlo (admite negativos)."
              value={carryover}
              onValueChange={setCarryover}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isItemMode ? 'Agregar' : 'Guardar presupuesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
