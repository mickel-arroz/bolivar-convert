'use client'

import { useMemo, useState } from 'react'
import { TransactionType, WalletApi } from '@/hooks/useWallet'
import { CATEGORY_ICON_KEYS, getCategoryIcon } from '@/constants/walletCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TrashIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { Field, TypeToggle } from './fields'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
}

const NEW_CATEGORY_COLORS = [
  'var(--rate-usd)',
  'var(--rate-eur)',
  'var(--rate-binance)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function CategoryManagerDialog({ open, onOpenChange, wallet }: CategoryManagerDialogProps) {
  const { state, addCategory, removeCategory } = wallet
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState(CATEGORY_ICON_KEYS[0])

  // Categorías en uso (no se pueden eliminar)
  const inUse = useMemo(() => {
    const set = new Set<string>()
    state.transactions.forEach((t) => set.add(t.categoryId))
    state.budgets.forEach((b) => set.add(b.categoryId))
    return set
  }, [state.transactions, state.budgets])

  const handleAdd = () => {
    if (!name.trim()) return
    const color = NEW_CATEGORY_COLORS[state.categories.length % NEW_CATEGORY_COLORS.length]
    addCategory(name, kind, icon, color)
    setName('')
    setIcon(CATEGORY_ICON_KEYS[0])
  }

  const renderGroup = (groupKind: TransactionType, title: string) => {
    const cats = state.categories.filter((c) => c.kind === groupKind)
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className="flex flex-col gap-1">
          {cats.map((c) => {
            const Icon = getCategoryIcon(c.icon)
            const blocked = c.isDefault || inUse.has(c.id)
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <Icon className="size-4" style={c.color ? { color: c.color } : undefined} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={blocked}
                  onClick={() => removeCategory(c.id)}
                  aria-label={`Eliminar ${c.name}`}
                  title={blocked ? 'No se puede eliminar (predeterminada o en uso)' : 'Eliminar'}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorías</DialogTitle>
          <DialogDescription>Crea y organiza tus categorías de gastos e ingresos.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <Field label="Tipo">
              <TypeToggle value={kind} onChange={setKind} />
            </Field>
            <Field label="Nombre">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría" />
            </Field>
            <Field label="Icono">
              <div className="grid grid-cols-5 gap-1.5">
                {CATEGORY_ICON_KEYS.map((key) => {
                  const Icon = getCategoryIcon(key)
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
            <Button onClick={handleAdd} disabled={!name.trim()} className="self-end">
              Agregar categoría
            </Button>
          </div>

          {renderGroup('expense', 'Gastos')}
          {renderGroup('income', 'Ingresos')}
        </div>
      </DialogContent>
    </Dialog>
  )
}
