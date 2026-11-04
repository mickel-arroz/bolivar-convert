'use client'

import { useEffect, useMemo, useState } from 'react'
import { Goal, WalletApi } from '@/hooks/useWallet'
import { getCurrency } from '@/constants/currencies'
import { ACCOUNT_ICON_MAP, getAccountIcon } from '@/constants/walletCategories'
import { CheckIcon, WalletIcon } from '@/components/icons'
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
import {
  computeAccountFunds,
  computePlanWithdrawable,
  parseAmount,
  parseSigned,
  splitPlanWithdrawal,
} from '@/lib/wallet/compute'
import { buildGoalMovements, movementIdOf } from '@/lib/wallet/goalMovements'
import { isGoalReached } from '@/lib/wallet/goalOrder'
import { Field, AmountField } from './fields'
import { formatMoney, todayInputValue } from './format'
import { mutationError } from './mutationMessages'

interface GoalContributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  /** Plan al que se mueve dinero (aporte o retiro nuevo). */
  goal?: Goal | null
  /** Aporte o retiro que se edita: permite cambiar también la cuenta y el plan. */
  editingMovementId?: string | null
}

type Direction = 'in' | 'out'

export function GoalContributionDialog({
  open,
  onOpenChange,
  wallet,
  goal: goalProp = null,
  editingMovementId = null,
}: GoalContributionDialogProps) {
  const { state, moveToGoal, updateGoalMovement } = wallet
  const [direction, setDirection] = useState<Direction>('in')
  const [goalId, setGoalId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [note, setNote] = useState('')

  const editing = useMemo(
    () =>
      editingMovementId
        ? buildGoalMovements(state.goals, state.goalContributions).find((m) => m.id === editingMovementId)
        : undefined,
    [editingMovementId, state.goals, state.goalContributions]
  )

  // Al editar, todo se valida como si el movimiento original no existiera.
  const base = useMemo(
    () =>
      editingMovementId
        ? {
            contributions: state.goalContributions.filter((c) => movementIdOf(c) !== editingMovementId),
            transactions: state.transactions.filter((t) => t.goalMovementId !== editingMovementId),
          }
        : { contributions: state.goalContributions, transactions: state.transactions },
    [editingMovementId, state.goalContributions, state.transactions]
  )

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    if (editing) {
      setDirection(editing.direction)
      setGoalId(editing.goalId)
      setAccountId(editing.accountId)
      setAmount(String(editing.amount))
      setDate(editing.date)
      setNote(editing.note ?? '')
    } else {
      setDirection('in')
      setGoalId(goalProp?.id ?? '')
      setAccountId(state.accounts.find((a) => a.currency === goalProp?.currency)?.id ?? '')
      setAmount('')
      setDate(todayInputValue())
      setNote('')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Solo al abrir: los cambios del monedero con la modal abierta no reinician el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingMovementId])

  const goal = state.goals.find((g) => g.id === goalId) ?? goalProp
  const eligibleAccounts = useMemo(
    () => (goal ? state.accounts.filter((a) => a.currency === goal.currency) : []),
    [goal, state.accounts]
  )
  const eligibleGoals = useMemo(
    () =>
      state.goals.filter(
        (g) => !g.completedAt && (!editing || g.currency === state.goals.find((x) => x.id === editing.goalId)?.currency)
      ),
    [state.goals, editing]
  )

  // El **Disponible** de cada cuenta: lo apartado en planes no se puede gastar sin
  // retirarlo antes, así que es contra esta cifra que se valida el débito (ADR 0002).
  const availableByAccount = useMemo(
    () =>
      new Map(
        computeAccountFunds({
          accounts: state.accounts,
          transactions: base.transactions,
          transfers: state.transfers,
          goalContributions: base.contributions,
          goals: state.goals,
        }).map((f) => [f.accountId, f.available])
      ),
    [state.accounts, state.transfers, state.goals, base]
  )

  if (!goal || (editingMovementId && !editing)) return null

  const goalBalance = base.contributions
    .filter((c) => c.goalId === goal.id)
    .reduce((sum, c) => sum + parseSigned(c.amount), 0)
  const target = parseAmount(goal.target)
  const amountNum = parseAmount(amount)
  const accountAvailable = availableByAccount.get(accountId) ?? 0
  const overAccount = direction === 'in' && amountNum > accountAvailable
  const withdrawable = computePlanWithdrawable(base.contributions, goal.id, accountId)
  const split = direction === 'out' && amountNum > 0 ? splitPlanWithdrawal(withdrawable, amountNum) : null
  const overGoal = direction === 'out' && amountNum > 0 && !split
  const accountOk = eligibleAccounts.some((a) => a.id === accountId)
  const canSubmit = accountOk && amountNum > 0 && !!date && !overAccount && !overGoal

  const handleSubmit = () => {
    if (!canSubmit) return
    const params = { goalId: goal.id, accountId, amount, direction, note, date }
    if (editing) {
      const res = updateGoalMovement(editing.id, params)
      if (!res.ok) {
        const e = mutationError(res.reason, 'edit')
        notify.error(e.title, e.description)
        return
      }
      notify.success('Movimiento actualizado')
      onOpenChange(false)
      return
    }
    if (!moveToGoal(params)) {
      notify.error(
        direction === 'in'
          ? 'El monto supera el Disponible de la cuenta'
          : 'El monto supera lo que puedes retirar hacia esta cuenta'
      )
      return
    }
    notify.success(direction === 'in' ? 'Aporte registrado' : 'Retiro registrado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar movimiento del plan' : goal.name}</DialogTitle>
          <DialogDescription>
            Mueve dinero entre tus cuentas en {getCurrency(goal.currency).label} y este plan de ahorro.
          </DialogDescription>
        </DialogHeader>

        {eligibleAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas al menos una cuenta en {getCurrency(goal.currency).label} (
            {getCurrency(goal.currency).symbol}) para mover dinero a este plan.
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

            {editing && (
              <Field label="Plan de ahorro">
                <Select value={goalId} onValueChange={(v) => setGoalId(v as string)}>
                  <SelectTrigger aria-label="Plan de ahorro">
                    <SelectValue>
                      {(val) => {
                        const g = eligibleGoals.find((x) => x.id === val)
                        if (!g) return <span className="text-muted-foreground">Selecciona un plan</span>
                        const Icon = getAccountIcon(g.icon)
                        return (
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0" style={g.color ? { color: g.color } : undefined} />
                            <span className="truncate">{g.name}</span>
                          </span>
                        )
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleGoals.map((g) => {
                      const Icon = getAccountIcon(g.icon)
                      return (
                        <SelectItem key={g.id} value={g.id}>
                          <Icon className="size-4" style={g.color ? { color: g.color } : undefined} />
                          {g.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>
            )}

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
                          {a.name} · {formatMoney(availableByAccount.get(a.id) ?? 0, a.currency)}
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
                        {a.name} · {formatMoney(availableByAccount.get(a.id) ?? 0, a.currency)}
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

            {editing && (
              <Field label="Nota">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
              </Field>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ahorrado en el plan</span>
                <span className="font-black tabular-nums">{formatMoney(goalBalance, goal.currency)}</span>
              </div>
              {target > 0 && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Restante para la meta</span>
                  {isGoalReached(goalBalance, target) ? (
                    <span className="flex items-center gap-1 font-black text-green-600 dark:text-green-400">
                      <CheckIcon className="size-3.5 shrink-0" />
                      Meta alcanzada
                    </span>
                  ) : (
                    <span data-testid="plan-remaining" className="font-black tabular-nums">
                      {formatMoney(target - goalBalance, goal.currency)}
                    </span>
                  )}
                </div>
              )}
              {direction === 'out' && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Puedes retirar hacia esta cuenta</span>
                  <span data-testid="plan-withdrawable" className="font-black tabular-nums">
                    {formatMoney(withdrawable.fromAccount + withdrawable.unattributed, goal.currency)}
                  </span>
                </div>
              )}
              {split && split.unattributed > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(split.unattributed, goal.currency)} entra a la cuenta como ingreso en
                  «Otros»: llegó al plan sin salir de ninguna cuenta.
                </p>
              )}
              {overAccount && (
                <p className="mt-1 text-xs text-destructive">
                  El monto supera el Disponible de la cuenta.
                </p>
              )}
              {overGoal && (
                <p className="mt-1 text-xs text-destructive">
                  Supera lo que puedes retirar hacia esta cuenta: lo que aportó otra cuenta solo
                  vuelve a esa cuenta.
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
            {editing ? 'Guardar cambios' : direction === 'in' ? 'Aportar' : 'Retirar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
