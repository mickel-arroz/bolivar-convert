'use client'

import { useEffect, useMemo, useState } from 'react'
import { Goal, WalletApi } from '@/hooks/useWallet'
import { getCurrency } from '@/constants/currencies'
import { ACCOUNT_ICON_MAP } from '@/constants/walletCategories'
import { WalletIcon } from '@/components/icons'
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Field, AmountField } from './fields'
import { formatMoney, todayInputValue } from './format'

interface GoalContributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  goal: Goal | null
}

type Direction = 'in' | 'out'

export function GoalContributionDialog({
  open,
  onOpenChange,
  wallet,
  goal,
}: GoalContributionDialogProps) {
  const { state, accountBalances, goalBalances, moveToGoal } = wallet
  const [direction, setDirection] = useState<Direction>('in')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInputValue())

  // Cuentas de la misma moneda que la meta.
  const eligibleAccounts = useMemo(
    () => (goal ? state.accounts.filter((a) => a.currency === goal.currency) : []),
    [goal, state.accounts]
  )

  const balanceByAccount = useMemo(
    () => new Map(accountBalances.map((b) => [b.accountId, b.balance])),
    [accountBalances]
  )
  const goalBalance = useMemo(
    () => (goal ? (goalBalances.find((b) => b.goalId === goal.id)?.balance ?? 0) : 0),
    [goal, goalBalances]
  )

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirection('in')
      setAccountId(eligibleAccounts[0]?.id ?? '')
      setAmount('')
      setDate(todayInputValue())
    }
  }, [open, eligibleAccounts])

  if (!goal) return null

  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  const accountBalance = balanceByAccount.get(accountId) ?? 0
  const overAccount = direction === 'in' && amountNum > accountBalance
  const overGoal = direction === 'out' && amountNum > goalBalance
  const canSubmit = !!accountId && amountNum > 0 && !overAccount && !overGoal

  const handleSubmit = () => {
    if (!canSubmit) return
    const ok = moveToGoal({ goalId: goal.id, accountId, amount, direction, note: undefined, date })
    if (!ok) {
      notify.error('El monto supera el saldo de la cuenta')
      return
    }
    notify.success(direction === 'in' ? 'Aporte registrado' : 'Retiro registrado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>
            Mueve dinero entre tus cuentas en {getCurrency(goal.currency).label} y esta meta.
          </DialogDescription>
        </DialogHeader>

        {eligibleAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas al menos una cuenta en {getCurrency(goal.currency).label} (
            {getCurrency(goal.currency).symbol}) para mover dinero a esta meta.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
              {(
                [
                  { id: 'in', label: 'Aportar' },
                  { id: 'out', label: 'Retirar' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDirection(o.id)}
                  className={cn(
                    'rounded-md py-1.5 text-sm font-bold transition-all',
                    direction === o.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <Field label={direction === 'in' ? 'Desde la cuenta' : 'Hacia la cuenta'}>
              <Select value={accountId} onValueChange={(v) => setAccountId(v as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const a = eligibleAccounts.find((x) => x.id === val)
                      if (!a) return <span className="text-muted-foreground">Selecciona una cuenta</span>
                      const Icon = ACCOUNT_ICON_MAP[a.icon] ?? WalletIcon
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {a.name} · {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency)}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((a) => {
                    const Icon = ACCOUNT_ICON_MAP[a.icon] ?? WalletIcon
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        <Icon className="size-4" />
                        {a.name} · {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <AmountField
                label="Monto"
                hint={getCurrency(goal.currency).symbol}
                value={amount}
                onValueChange={setAmount}
                autoFocus
              />
              <Field label="Fecha">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ahorrado en la meta</span>
                <span className="font-black tabular-nums">{formatMoney(goalBalance, goal.currency)}</span>
              </div>
              {overAccount && (
                <p className="mt-1 text-xs text-destructive">
                  El monto supera el saldo disponible de la cuenta.
                </p>
              )}
              {overGoal && (
                <p className="mt-1 text-xs text-destructive">
                  No puedes retirar más de lo ahorrado en la meta.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {direction === 'in' ? 'Aportar' : 'Retirar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
