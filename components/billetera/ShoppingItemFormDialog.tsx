'use client'

import { useEffect, useMemo, useState } from 'react'
import { CurrencyId, getCurrency } from '@/constants/currencies'
import { ShoppingListItem, WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clampDigits } from '@/lib/numberInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Field, CurrencyToggle } from './fields'

const TITLE_MAX = 60
const DESC_MAX = 200

interface ShoppingItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  listId: string
  editing?: ShoppingListItem | null
}

export function ShoppingItemFormDialog({
  open,
  onOpenChange,
  wallet,
  listId,
  editing,
}: ShoppingItemFormDialogProps) {
  const { state, addShoppingItem, updateShoppingItem } = wallet
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<CurrencyId>('VES')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(editing?.title ?? '')
      setDescription(editing?.description ?? '')
      setPrice(editing?.price ?? '')
      setCurrency(editing?.currency ?? 'VES')
    }
  }, [open, editing])

  const duplicate = useMemo(() => {
    const t = title.trim().toLowerCase()
    if (!t) return false
    return state.shoppingItems.some(
      (it) =>
        it.listId === listId && it.id !== editing?.id && it.title.trim().toLowerCase() === t
    )
  }, [title, state.shoppingItems, listId, editing])

  const canSubmit = !!title.trim() && !duplicate

  const handleSubmit = () => {
    if (!canSubmit) return
    if (editing) {
      updateShoppingItem(editing.id, {
        title: title.trim(),
        description,
        price: price || '0',
        currency,
      })
    } else {
      addShoppingItem({ listId, title, description: description || undefined, price: price || '0', currency })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>Añade un producto con su precio estimado y moneda.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Título" hint={`${title.length}/${TITLE_MAX}`}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Arroz, Taladro…"
              maxLength={TITLE_MAX}
              aria-invalid={duplicate}
              autoFocus
            />
            {duplicate && (
              <span className="text-xs text-destructive">
                Ya existe un producto con ese título en esta lista.
              </span>
            )}
          </Field>

          <Field label="Descripción" hint={`Opcional · ${description.length}/${DESC_MAX}`}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Marca, cantidad, detalles…"
              rows={2}
              maxLength={DESC_MAX}
              className={cn(
                'w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'md:text-sm dark:bg-input/30'
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio" hint={getCurrency(currency).symbol}>
              <Input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(clampDigits(e.target.value))}
                placeholder="0,00"
              />
            </Field>
            <Field label="Moneda">
              <CurrencyToggle value={currency} onChange={setCurrency} />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {editing ? 'Guardar' : 'Añadir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
