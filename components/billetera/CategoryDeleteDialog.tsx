'use client'

import { useEffect, useMemo, useState } from 'react'
import { Category, WalletApi } from '@/hooks/useWallet'
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
import { AlertIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { Field } from './fields'

interface CategoryDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  category: Category | null
}

type Mode = 'reassign' | 'delete'
type Strategy = 'merge' | 'overwrite'

export function CategoryDeleteDialog({ open, onOpenChange, wallet, category }: CategoryDeleteDialogProps) {
  const { state, removeCategory, reassignCategory } = wallet
  const [mode, setMode] = useState<Mode>('reassign')
  const [targetId, setTargetId] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('merge')

  // Datos asociados a la categoría
  const txCount = useMemo(
    () => (category ? state.transactions.filter((t) => t.categoryId === category.id).length : 0),
    [category, state.transactions]
  )
  const budgetCount = useMemo(
    () => (category ? state.budgets.filter((b) => b.categoryId === category.id).length : 0),
    [category, state.budgets]
  )
  const hasData = txCount > 0 || budgetCount > 0

  // Categorías destino válidas (mismo tipo, excluye la actual)
  const targets = useMemo(
    () =>
      category
        ? state.categories.filter((c) => c.id !== category.id && c.kind === category.kind)
        : [],
    [category, state.categories]
  )

  const isLast = state.categories.length <= 1

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(targets.length > 0 ? 'reassign' : 'delete')
      setTargetId(targets[0]?.id ?? '')
      setStrategy('merge')
    }
  }, [open, targets])

  if (!category) return null

  const handleConfirm = () => {
    if (isLast) return
    if (hasData && mode === 'reassign' && targetId) {
      reassignCategory(category.id, targetId, strategy)
    } else {
      removeCategory(category.id)
    }
    onOpenChange(false)
  }

  const canReassign = targets.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar «{category.name}»</DialogTitle>
          <DialogDescription>
            {isLast
              ? 'No puedes eliminar la última categoría que queda.'
              : hasData
                ? 'Esta categoría tiene datos asociados. Elige qué hacer con ellos.'
                : '¿Seguro que quieres eliminar esta categoría?'}
          </DialogDescription>
        </DialogHeader>

        {isLast ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <span>Debe existir al menos una categoría. Crea otra antes de eliminar esta.</span>
          </p>
        ) : hasData ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {txCount > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-1 font-bold text-muted-foreground">
                  {txCount} movimiento{txCount !== 1 ? 's' : ''}
                </span>
              )}
              {budgetCount > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-1 font-bold text-muted-foreground">
                  {budgetCount} presupuesto{budgetCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Selección de modo */}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => canReassign && setMode('reassign')}
                disabled={!canReassign}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all disabled:opacity-50',
                  mode === 'reassign'
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/60 hover:border-foreground/30'
                )}
              >
                <span className="text-sm font-bold">Reasignar a otra categoría</span>
                <span className="text-xs text-muted-foreground">
                  {canReassign
                    ? 'Mueve los movimientos y presupuestos a la categoría que elijas.'
                    : 'No hay otra categoría del mismo tipo disponible.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('delete')}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all',
                  mode === 'delete'
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border/60 hover:border-foreground/30'
                )}
              >
                <span className="text-sm font-bold text-destructive">Eliminar todo</span>
                <span className="text-xs text-muted-foreground">
                  Borra la categoría junto con sus movimientos y presupuestos.
                </span>
              </button>
            </div>

            {/* Detalles de reasignación */}
            {mode === 'reassign' && canReassign && (
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                <Field label="Categoría destino">
                  <Select value={targetId} onValueChange={(v) => setTargetId(v as string)}>
                    <SelectTrigger>
                      <SelectValue>
                        {(val) => {
                          const c = targets.find((x) => x.id === val)
                          if (!c) return <span className="text-muted-foreground">Selecciona…</span>
                          const Icon = getCategoryIcon(c.icon)
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
                      {targets.map((c) => {
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
                </Field>

                {budgetCount > 0 && (
                  <Field
                    label="Si coinciden presupuestos del mismo mes"
                    hint="Solo aplica cuando ambas categorías tienen presupuesto en el mismo mes."
                  >
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
                      {(
                        [
                          { id: 'merge', label: 'Unificar' },
                          { id: 'overwrite', label: 'Sobrescribir' },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setStrategy(o.id)}
                          className={cn(
                            'rounded-md py-1.5 text-sm font-bold transition-all',
                            strategy === o.id
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isLast ? 'Entendido' : 'Cancelar'}
          </Button>
          {!isLast && (
            <Button
              variant={mode === 'delete' || !hasData ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={hasData && mode === 'reassign' && !targetId}
            >
              {hasData && mode === 'reassign' ? 'Reasignar y eliminar' : 'Eliminar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
