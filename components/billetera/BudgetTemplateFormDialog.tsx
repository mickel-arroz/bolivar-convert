'use client'

import { useEffect, useMemo, useState } from 'react'
import { BudgetTemplate, WalletApi, monthKey } from '@/hooks/useWallet'
import {
  ACCOUNT_ICON_KEYS,
  getAccountIcon,
  getCategoryIcon,
} from '@/constants/walletCategories'
import { PlusIcon, PencilIcon, TrashIcon } from '@/components/icons'
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
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Field, ColorPicker } from './fields'
import { formatMoney } from './format'
import { BudgetFormDialog, BudgetDraftItem } from './BudgetFormDialog'

interface BudgetTemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: BudgetTemplate | null
}

export function BudgetTemplateFormDialog({
  open,
  onOpenChange,
  wallet,
  editing,
}: BudgetTemplateFormDialogProps) {
  const { state, addBudgetTemplate, updateBudgetTemplate, setBudget, removeBudget } = wallet
  const month = useMemo(() => monthKey(new Date()), [])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('wallet')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [items, setItems] = useState<BudgetDraftItem[]>([])
  const [itemDialog, setItemDialog] = useState<{ open: boolean; editing: BudgetDraftItem | null }>({
    open: false,
    editing: null,
  })

  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(editing?.name ?? '')
    setDescription(editing?.description ?? '')
    setIcon(editing?.icon ?? 'wallet')
    setColor(editing?.color)
    if (editing) {
      const existing = state.budgets
        .filter((b) => b.templateId === editing.id && b.month === month)
        .map((b) => ({ categoryId: b.categoryId, limit: b.limit, currency: b.currency }))
      setItems(existing)
    } else {
      setItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, month])

  const upsertItem = (item: BudgetDraftItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.categoryId === item.categoryId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item]
    })
  }

  const removeItem = (categoryId: string) => {
    setItems((prev) => prev.filter((i) => i.categoryId !== categoryId))
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const meta = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
    }
    if (editing) {
      updateBudgetTemplate(editing.id, meta)
      const keep = new Set(items.map((i) => i.categoryId))
      for (const b of state.budgets) {
        if (b.templateId === editing.id && b.month === month && !keep.has(b.categoryId)) {
          removeBudget(b.id)
        }
      }
      // No pasar carryover conserva el extra existente.
      for (const item of items) {
        setBudget(item.categoryId, month, item.limit, item.currency, undefined, editing.id)
      }
      notify.success('Plantilla actualizada')
    } else {
      const id = addBudgetTemplate(meta)
      for (const item of items) {
        setBudget(item.categoryId, month, item.limit, item.currency, '0', id)
      }
      notify.success('Plantilla creada')
    }
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
            <DialogDescription>
              Un grupo de presupuestos reutilizable. Agrega los que quieras antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Mes normal, Vacaciones…"
                autoFocus
              />
            </Field>

            <Field label="Descripción" hint="Muy corta; se muestra junto a la plantilla.">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Gastos base del mes"
                maxLength={80}
              />
            </Field>

            <Field label="Icono">
              <div className="grid grid-cols-5 gap-1.5">
                {ACCOUNT_ICON_KEYS.map((key) => {
                  const Icon = getAccountIcon(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-lg border transition-all',
                        icon === key
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Color">
              <ColorPicker value={color} onChange={setColor} />
            </Field>

            <Field label="Presupuestos">
              <div className="flex flex-col gap-2">
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center text-xs text-muted-foreground">
                    Aún no has agregado presupuestos a esta plantilla.
                  </p>
                )}
                {items.map((item) => {
                  const cat = categoryById.get(item.categoryId)
                  const Icon = getCategoryIcon(cat?.icon ?? 'other')
                  return (
                    <div
                      key={item.categoryId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Icon
                          className="size-4 shrink-0"
                          style={cat?.color ? { color: cat.color } : undefined}
                        />
                        <span className="truncate text-sm font-bold">
                          {cat?.name ?? 'Categoría'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatMoney(parseFloat(item.limit.replace(',', '.')) || 0, item.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setItemDialog({ open: true, editing: item })}
                          aria-label="Editar presupuesto"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(item.categoryId)}
                          aria-label="Quitar presupuesto"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setItemDialog({ open: true, editing: null })}
                  disabled={state.categories.every((c) => c.kind !== 'expense')}
                >
                  <PlusIcon className="size-4" /> Agregar presupuesto
                </Button>
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editing ? 'Guardar' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BudgetFormDialog
        open={itemDialog.open}
        onOpenChange={(o) => setItemDialog((d) => ({ ...d, open: o }))}
        wallet={wallet}
        asItem={{
          editing: itemDialog.editing,
          existingCategoryIds: items.map((i) => i.categoryId),
          onSubmit: upsertItem,
        }}
      />
    </>
  )
}
