'use client'

import { useEffect, useMemo, useState } from 'react'
import { CurrencyId, getCurrency } from '@/constants/currencies'
import { ShoppingListItem, WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  SelectItem,
} from '@/components/ui/select'
import { ACCOUNT_ICON_MAP } from '@/constants/walletCategories'
import { WalletIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import {
  SHOPPING_PRIORITIES,
  PRIORITY_LABELS,
  DEFAULT_SHOPPING_PRIORITY,
  ShoppingPriority,
  normalizePriority,
} from '@/constants/shoppingPriority'
import { Field, AmountField, CurrencyToggle } from './fields'

const TITLE_MAX = 60
const DESC_MAX = 300

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
  const [priority, setPriority] = useState<ShoppingPriority>(DEFAULT_SHOPPING_PRIORITY)
  const [targetListId, setTargetListId] = useState(listId)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(editing?.title ?? '')
      setDescription(editing?.description ?? '')
      setPrice(editing?.price ?? '')
      setCurrency(editing?.currency ?? 'VES')
      setPriority(normalizePriority(editing?.priority))
      setTargetListId(editing?.listId ?? listId)
    }
  }, [open, editing, listId])

  const lists = useMemo(
    () => [...state.shoppingLists].sort((a, b) => a.name.localeCompare(b.name)),
    [state.shoppingLists]
  )
  const showListSelect = !!editing && lists.length > 1

  const duplicate = useMemo(() => {
    const t = title.trim().toLowerCase()
    if (!t) return false
    return state.shoppingItems.some(
      (it) =>
        it.listId === targetListId && it.id !== editing?.id && it.title.trim().toLowerCase() === t
    )
  }, [title, state.shoppingItems, targetListId, editing])

  const canSubmit = !!title.trim() && !duplicate

  const handleSubmit = () => {
    if (!canSubmit) return
    if (editing) {
      updateShoppingItem(editing.id, {
        listId: targetListId,
        title: title.trim(),
        description,
        price: price || '0',
        currency,
        priority,
      })
    } else {
      addShoppingItem({
        listId,
        title,
        description: description || undefined,
        price: price || '0',
        currency,
        priority,
      })
    }
    notify.success(
      editing
        ? targetListId !== editing.listId
          ? 'Producto movido'
          : 'Producto actualizado'
        : 'Producto añadido'
    )
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
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Marca, cantidad, detalles…"
              rows={2}
              maxLength={DESC_MAX}
            />
          </Field>

          {showListSelect && (
            <Field label="Lista">
              <Select value={targetListId} onValueChange={(v) => setTargetListId(v as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const l = lists.find((x) => x.id === val)
                      if (!l) return <span className="text-muted-foreground">Selecciona una lista</span>
                      const Icon = ACCOUNT_ICON_MAP[l.icon ?? ''] ?? WalletIcon
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {l.name}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => {
                    const Icon = ACCOUNT_ICON_MAP[l.icon ?? ''] ?? WalletIcon
                    return (
                      <SelectItem key={l.id} value={l.id}>
                        <Icon className="size-4" />
                        {l.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Prioridad" hint="1 es la más importante; 4 la menos.">
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/50 p-1">
              {SHOPPING_PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-md py-1.5 text-sm font-bold transition-all',
                    priority === p
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{p}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {PRIORITY_LABELS[p]}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <AmountField
              label="Precio"
              hint={getCurrency(currency).symbol}
              value={price}
              onValueChange={setPrice}
            />
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
