'use client'

import { useMemo, useState } from 'react'
import { Goal, WalletApi } from '@/hooks/useWallet'
import { getAccountIcon } from '@/constants/walletCategories'
import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { parseSigned } from '@/lib/wallet/compute'
import { notify } from '@/lib/notify'
import { formatMoney, todayInputValue } from './format'

interface GoalDeleteDialogProps {
  goal: Goal | null
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
}

/**
 * Confirma la eliminación de un plan diciendo qué pasa con su dinero: lo aportado desde
 * cada cuenta vuelve a su Disponible; lo que llegó sin cuenta se pierde, salvo que se
 * retire antes hacia una cuenta (entra como ingreso en «Otros»).
 */
export function GoalDeleteDialog({ goal, onOpenChange, wallet }: GoalDeleteDialogProps) {
  const { state, removeGoal, moveToGoal } = wallet
  const [chosenAccountId, setChosenAccountId] = useState<string | null>(null)

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
  }, [state.goalContributions, goal?.id])

  const accounts = state.accounts.filter((a) => a.currency === goal?.currency)
  const accountId =
    chosenAccountId && accounts.some((a) => a.id === chosenAccountId)
      ? chosenAccountId
      : (byAccount[0]?.[0] ?? accounts[0]?.id ?? null)

  if (!goal) return null

  const accountName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? 'Cuenta'
  const close = () => {
    setChosenAccountId(null)
    onOpenChange(false)
  }

  const handleDelete = () => {
    removeGoal(goal.id)
    notify.success('Plan de ahorro eliminado')
    close()
  }

  // El retiro saca primero lo que esa cuenta aportó y después lo sin cuenta, así que se
  // pide todo junto: lo aportado vuelve a su Disponible y lo sin cuenta entra como ingreso.
  const handleWithdrawAndDelete = () => {
    if (!accountId) return
    const fromAccount = byAccount.find(([id]) => id === accountId)?.[1] ?? 0
    const ok = moveToGoal({
      goalId: goal.id,
      accountId,
      amount: String(fromAccount + unattributed),
      direction: 'out',
      date: todayInputValue(),
    })
    if (!ok) {
      notify.error('No se pudo retirar el dinero del plan')
      return
    }
    removeGoal(goal.id)
    notify.success(
      'Plan de ahorro eliminado',
      `${formatMoney(unattributed, goal.currency)} entraron a ${accountName(accountId)}.`
    )
    close()
  }

  return (
    <AlertDialog open={!!goal} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar plan de ahorro</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará «{goal.name}» y su historial de aportes. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {byAccount.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3">
              <span className="text-xs font-semibold text-muted-foreground">Vuelve a «Disponible»</span>
              {byAccount.map(([id, amount]) => (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{accountName(id)}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {formatMoney(amount, goal.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {unattributed > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="flex items-start gap-2">
                <AlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <span>
                  <strong className="tabular-nums">{formatMoney(unattributed, goal.currency)}</strong>{' '}
                  llegaron al plan sin cuenta (sobrante de un mes) y se perderán. Retíralos a una
                  cuenta para conservarlos: entran como ingreso en «Otros».
                </span>
              </p>
              {accounts.length > 0 ? (
                <Select value={accountId} onValueChange={(v) => setChosenAccountId(v as string)}>
                  <SelectTrigger aria-label="Cuenta destino" className="bg-card">
                    <SelectValue>
                      {(val) => {
                        const a = accounts.find((x) => x.id === val)
                        if (!a) return 'Elige una cuenta'
                        const Icon = getAccountIcon(a.icon)
                        return (
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0" style={a.color ? { color: a.color } : undefined} />
                            <span className="truncate">{a.name}</span>
                          </span>
                        )
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => {
                      const Icon = getAccountIcon(a.icon)
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          <Icon className="size-4" style={a.color ? { color: a.color } : undefined} />
                          {a.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No tienes cuentas en esta moneda para retirarlo.
                </p>
              )}
            </div>
          )}

          {byAccount.length === 0 && unattributed === 0 && (
            <p className="text-muted-foreground">El plan no tiene dinero.</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {unattributed > 0 ? (
            <>
              <Button variant="outline" className="text-destructive" onClick={handleDelete}>
                Eliminar y perder {formatMoney(unattributed, goal.currency)}
              </Button>
              <Button onClick={handleWithdrawAndDelete} disabled={!accountId}>
                Retirar todo y eliminar
              </Button>
            </>
          ) : (
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
