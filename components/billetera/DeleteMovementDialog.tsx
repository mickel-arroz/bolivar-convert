'use client'

import { useMemo } from 'react'
import { Rates } from '@/constants/rates'
import { WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
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
import { resolveCommission, parseAmount } from '@/lib/wallet/compute'
import { notify } from '@/lib/notify'
import { formatMoney, formatDate } from './format'
import { CarryoverCorrectionsNotice } from './CarryoverCorrectionsNotice'
import { mutationError } from './mutationMessages'

/** Qué movimiento se va a eliminar. */
export type DeleteTarget = { kind: 'tx'; id: string } | { kind: 'transfer'; id: string } | null

interface DeleteMovementDialogProps {
  target: DeleteTarget
  onClose: () => void
  wallet: WalletApi
  rates: Rates
}

/**
 * Confirmación antes de eliminar un movimiento o traspaso. Dice qué pasa con el saldo de
 * las cuentas, avisa si el gasto era la compra de un producto (que vuelve a pendiente) y,
 * si es de un mes ya concluido, pregunta qué hacer con la diferencia del extra arrastrado.
 */
export function DeleteMovementDialog({ target, onClose, wallet, rates }: DeleteMovementDialogProps) {
  const { state, previewTransactionChange, removeTransaction, removeTransfer } = wallet

  const tx = target?.kind === 'tx' ? state.transactions.find((t) => t.id === target.id) : undefined
  const transfer =
    target?.kind === 'transfer' ? state.transfers.find((t) => t.id === target.id) : undefined

  const plan = useMemo(
    () => (tx ? previewTransactionChange(tx.id, null, rates) : null),
    // `state` cambia cuando algo del monedero cambia; el plan se calcula sobre el estado vivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx, rates, state]
  )

  if (!target || (!tx && !transfer)) return null

  const hasChoice = !!plan && plan.corrections.length > 0

  const confirm = (addExtra: boolean) => {
    if (tx) {
      const res = removeTransaction(tx.id, { rates, addExtra })
      if (!res.ok) {
        const e = mutationError(res.reason, 'deleteTx')
        notify.error(e.title, e.description)
        onClose()
        return
      }
      notify.success(
        'Movimiento eliminado',
        plan?.linkedItem ? `«${plan.linkedItem.title}» volvió a pendiente.` : undefined
      )
    } else if (transfer) {
      const res = removeTransfer(transfer.id)
      if (!res.ok) {
        const e = mutationError(res.reason, 'deleteTransfer')
        notify.error(e.title, e.description)
        onClose()
        return
      }
      notify.success('Traspaso eliminado')
    }
    onClose()
  }

  let title = 'Eliminar'
  let body: string
  if (tx) {
    const account = state.accounts.find((a) => a.id === tx.accountId)
    const category = state.categories.find((c) => c.id === tx.categoryId)
    const amount = parseAmount(tx.amount)
    const commission = resolveCommission(amount, tx.commission, tx.commissionType)
    const isIncome = tx.type === 'income'
    const effect = isIncome ? amount - commission : amount + commission
    title = isIncome ? 'Eliminar ingreso' : 'Eliminar gasto'
    body = account
      ? `«${category?.name ?? 'Sin categoría'}» · ${formatMoney(amount, account.currency)} · ${formatDate(tx.date)}. El saldo de «${account.name}» ${isIncome ? 'baja' : 'sube'} ${formatMoney(effect, account.currency)}.`
      : `«${category?.name ?? 'Sin categoría'}» · ${formatDate(tx.date)}.`
  } else {
    const from = state.accounts.find((a) => a.id === transfer!.fromAccountId)
    const to = state.accounts.find((a) => a.id === transfer!.toAccountId)
    const fromAmount = parseAmount(transfer!.fromAmount)
    const back =
      fromAmount + resolveCommission(fromAmount, transfer!.commission, transfer!.commissionType)
    title = 'Eliminar traspaso'
    body =
      from && to
        ? `«${from.name}» recupera ${formatMoney(back, from.currency)} y «${to.name}» pierde ${formatMoney(parseAmount(transfer!.toAmount), to.currency)}.`
        : 'El traspaso se elimina de ambas cuentas.'
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body} Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>

        {plan?.linkedItem && (
          <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            Este gasto es la compra de <strong>«{plan.linkedItem.title}»</strong>: el producto volverá a
            pendiente en tu lista.
          </p>
        )}
        {plan && <CarryoverCorrectionsNotice plan={plan} />}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {hasChoice ? (
            <>
              <AlertDialogAction onClick={() => confirm(false)}>Eliminar y descartar</AlertDialogAction>
              <AlertDialogAction render={<Button />} onClick={() => confirm(true)}>
                Eliminar y añadir extra
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={() => confirm(false)}>Eliminar</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
