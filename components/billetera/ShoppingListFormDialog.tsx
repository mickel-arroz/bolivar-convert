'use client'

import { useEffect, useState } from 'react'
import { ShoppingList, WalletApi } from '@/hooks/useWallet'
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { ACCOUNT_ICON_KEYS, getAccountIcon } from '@/constants/walletCategories'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Field, ColorPicker } from './fields'

interface ShoppingListFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: ShoppingList | null
}

export function ShoppingListFormDialog({
  open,
  onOpenChange,
  wallet,
  editing,
}: ShoppingListFormDialogProps) {
  const { addShoppingList, updateShoppingList } = wallet
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('shopping')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editing?.name ?? '')
      setIcon(editing?.icon ?? 'shopping')
      setColor(editing?.color)
    }
  }, [open, editing])

  const save = () => {
    if (!name.trim()) return
    if (editing) {
      updateShoppingList(editing.id, { name: name.trim(), icon, color })
    } else {
      addShoppingList(name, icon, color)
    }
    notify.success(editing ? 'Lista actualizada' : 'Lista creada')
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    if (editing) setConfirmOpen(true)
    else save()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar lista' : 'Nueva lista de compras'}</DialogTitle>
          <DialogDescription>
            Organiza lo que quieres comprar. Cada producto puede tener su propia moneda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Título">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mercado del mes, Ferretería…"
              autoFocus
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editing ? 'Guardar cambios' : 'Crear lista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Guardar cambios</AlertDialogTitle>
          <AlertDialogDescription>
            Se actualizará la lista «{editing?.name}» con el título, icono y color indicados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction render={<Button />} onClick={save}>
            Guardar cambios
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
