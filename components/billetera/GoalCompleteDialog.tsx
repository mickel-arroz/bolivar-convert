'use client'

import { useMemo, useState } from 'react'
import { Goal, WalletApi } from '@/hooks/useWallet'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { parseSigned } from '@/lib/wallet/compute'
import { notify } from '@/lib/notify'
import { Field } from './fields'
import { formatMoney, todayInputValue } from './format'

interface GoalCompleteDialogProps {
  goal: Goal | null
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
}

/**
 * Confirma completar un plan: su dinero se gasta (un gasto en «Planes de ahorro» por
 * cada cuenta que aportó) y el plan deja de mostrarse. Se deshace eliminando el gasto.
 */
export function GoalCompleteDialog({ goal, onOpenChange, wallet }: GoalCompleteDialogProps) {
  const { state, completeGoal } = wallet
  const [date, setDate] = useState(todayInputValue)

  const { byAccount, unattributed } = useMemo(() => {
    const sums = new Map<string, number>()
    let orphan = 0
    for (const gc of goal ? state.goalContributions : []) {
      if (gc.goalId !== goal?.id) continue
      if (gc.accountId) sums.set(gc.accountId, (sums.get(gc.accountId) ?? 0) + parseSigned(gc.amount))
      else orphan += parseSigned(gc.amount)
    }
    return {
      byAccount: [...sums].filter(([, amount]) => amount >= 0.005),
      unattributed: orphan >= 0.005 ? orphan : 0,
    }
  }, [state.goalContributions, goal])

  if (!goal) return null

  const accountName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? 'Cuenta'
  const close = () => {
    setDate(todayInputValue())
    onOpenChange(false)
  }

  const handleComplete = () => {
    if (!date || !completeGoal(goal.id, date)) {
      notify.error('No se pudo completar el plan')
      return
    }
    notify.success('Plan completado', `«${goal.name}» quedó como gasto en tus movimientos.`)
    close()
  }

  return (
    <AlertDialog open={!!goal} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Completar «{goal.name}»</AlertDialogTitle>
          <AlertDialogDescription>
            El dinero del plan se gasta: se registra como un gasto en la categoría «Planes de
            ahorro» y el plan deja de aparecer en tu lista. Solo quedará en tus movimientos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {byAccount.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3">
              <span className="text-xs font-semibold text-muted-foreground">Gasto por cuenta</span>
              {byAccount.map(([id, amount]) => (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{accountName(id)}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-destructive">
                    −{formatMoney(amount, goal.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {unattributed > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatMoney(unattributed, goal.currency)} llegaron al plan sin cuenta: no salen de
              ninguna cuenta y simplemente desaparecen.
            </p>
          )}
          <Field label="Fecha del gasto">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            ¿Te equivocaste? Elimina ese gasto desde Movimientos y el plan vuelve tal como estaba,
            con su dinero apartado en las mismas cuentas.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            className="bg-green-600 text-white hover:bg-green-600/90 dark:bg-green-500 dark:hover:bg-green-500/90"
            onClick={handleComplete}
            disabled={!date}
          >
            <CheckIcon className="size-4" /> Completar plan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
