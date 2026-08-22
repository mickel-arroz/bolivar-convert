'use client'

import { ReactNode, useState } from 'react'
import { getCurrency } from '@/constants/currencies'
import { ShoppingListItem, WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
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
import { PencilIcon, TrashIcon } from '@/components/icons'
import { formatMoney, formatDate } from './format'

interface ShoppingItemDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  item: ShoppingListItem | null
  onEdit: (item: ShoppingListItem) => void
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function ShoppingItemDetailDialog({
  open,
  onOpenChange,
  wallet,
  item,
  onEdit,
}: ShoppingItemDetailDialogProps) {
  const { state, removeShoppingItem } = wallet
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!item) return null

  const price = parseFloat(String(item.price).replace(',', '.')) || 0
  const account = item.purchase
    ? state.accounts.find((a) => a.id === item.purchase!.accountId)
    : undefined
  const cost = item.purchase
    ? parseFloat(String(item.purchase.cost).replace(',', '.')) || 0
    : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-words">{item.title}</DialogTitle>
            <DialogDescription>
              {item.purchased ? 'Producto comprado.' : 'Producto pendiente por comprar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col divide-y divide-border/60">
            {item.description && (
              <div className="pb-2 text-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Descripción
                </p>
                <p className="whitespace-pre-line break-words text-foreground">{item.description}</p>
              </div>
            )}
            <Row label="Precio" value={formatMoney(price, item.currency)} />
            <Row label="Moneda" value={getCurrency(item.currency).label} />
            <Row
              label="Estado"
              value={
                item.purchased ? (
                  <span className="text-green-600 dark:text-green-400">Comprado</span>
                ) : (
                  <span className="text-muted-foreground">Pendiente</span>
                )
              }
            />
            {item.purchased && item.purchase && (
              <>
                <Row label="Cuenta" value={account?.name ?? 'Cuenta eliminada'} />
                <Row label="Costo pagado" value={formatMoney(cost, item.currency)} />
                {item.purchase.rate && (
                  <Row
                    label="Tasa usada"
                    value={parseFloat(item.purchase.rate.value).toString()}
                  />
                )}
                <Row label="Fecha" value={formatDate(item.purchase.date)} />
              </>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="size-4" /> Eliminar
            </Button>
            <Button onClick={() => onEdit(item)}>
              <PencilIcon className="size-4" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{item.title}»
              {item.purchased ? ' y el gasto registrado de su compra' : ''}. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeShoppingItem(item.id)
                setConfirmDelete(false)
                onOpenChange(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
