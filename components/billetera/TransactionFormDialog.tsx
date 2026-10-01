'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Transaction,
  TransactionType,
  CommissionType,
  TransactionChangePlan,
  WalletApi,
} from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCurrency } from '@/constants/currencies'
import {
  getCategoryIcon,
  CATEGORY_ICON_MAP,
  ACCOUNT_ICON_MAP,
  userCategories,
} from '@/constants/walletCategories'
import { DotsIcon, WalletIcon, CalculatorIcon } from '@/components/icons'
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Field, TypeToggle, AmountPreview, CommissionField } from './fields'
import { CarryoverCorrectionsNotice } from './CarryoverCorrectionsNotice'
import { mutationError } from './mutationMessages'
import { useMathInput } from '@/hooks/useMathInput'
import { resolveCommission } from '@/lib/wallet/compute'
import { notify } from '@/lib/notify'
import { todayInputValue } from './format'
import { AmountCalculatorDialog } from './AmountCalculatorDialog'

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: Transaction | null
  defaultType?: TransactionType
  rates: Rates
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  wallet,
  editing,
  defaultType = 'expense',
  rates,
}: TransactionFormDialogProps) {
  const { state, accountFunds, addTransaction, updateTransaction, previewTransactionChange } = wallet
  // Cambio pendiente de confirmar: editar un gasto de un mes ya concluido pregunta qué
  // hacer con la diferencia del extra arrastrado.
  const [pendingEdit, setPendingEdit] = useState<{
    payload: Partial<Transaction>
    plan: TransactionChangePlan
  } | null>(null)
  const [type, setType] = useState<TransactionType>(defaultType)
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [commission, setCommission] = useState('')
  const [commissionType, setCommissionType] = useState<CommissionType>('percent')
  const [commissionTouched, setCommissionTouched] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [calcOpen, setCalcOpen] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(editing?.type ?? defaultType)
      setAccountId(editing?.accountId ?? state.accounts[0]?.id ?? '')
      setCategoryId(editing?.categoryId ?? '')
      setAmount(editing?.amount ?? '')
      setCommission(editing?.commission ?? '')
      setCommissionType(editing?.commissionType ?? 'percent')
      setCommissionTouched(!!editing)
      setNote(editing?.note ?? '')
      setDate(editing?.date ?? todayInputValue())
    }
  }, [open, editing, defaultType, state.accounts])

  useEffect(() => {
    if (!open || editing || commissionTouched) return
    const acc = state.accounts.find((a) => a.id === accountId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommission(acc?.commission ?? '')
    setCommissionType(acc?.commissionType ?? 'percent')
  }, [open, editing, accountId, commissionTouched, state.accounts])

  const categories = useMemo(
    () => userCategories(state.categories, editing?.categoryId).filter((c) => c.kind === type),
    [state.categories, type, editing?.categoryId]
  )

  // Si cambia el tipo y la categoría seleccionada ya no aplica, limpiarla
  useEffect(() => {
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId('')
    }
  }, [categories, categoryId])

  const amountInput = useMathInput(amount, setAmount)

  const accountCurrency = state.accounts.find((a) => a.id === accountId)?.currency
  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  // El **Disponible** de la cuenta: lo apartado en metas no se puede gastar (ADR 0002).
  const currentAvailable = accountFunds.find((f) => f.accountId === accountId)?.available ?? 0
  const commissionNum = resolveCommission(amountNum, commission.trim() || undefined, commissionType)
  const overBalance =
    !editing && type === 'expense' && amountNum > 0 && amountNum + commissionNum > currentAvailable + 1e-6
  const canSubmit = amountNum > 0 && !!accountId && !!categoryId && !overBalance

  // Si este gasto es la compra de un producto, su dinero queda fijo (ver `updateTransaction`).
  const linkedItem = editing
    ? state.shoppingItems.find((it) => it.purchase?.transactionId === editing.id)
    : undefined
  const moneyLocked = !!linkedItem

  const applyEdit = (payload: Partial<Transaction>, addExtra: boolean) => {
    if (!editing) return
    const res = updateTransaction(editing.id, payload, { rates, addExtra })
    if (!res.ok) {
      const e = mutationError(res.reason, 'edit')
      notify.error(e.title, e.description)
      return
    }
    notify.success('Movimiento actualizado')
    setPendingEdit(null)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const commissionValue = commission.trim() || undefined
    const payload = {
      type,
      accountId,
      categoryId,
      amount,
      commission: commissionValue,
      commissionType: commissionValue ? commissionType : undefined,
      note,
      date,
    }
    if (editing) {
      // Si el cambio toca un mes ya concluido, se pregunta antes qué hacer con el extra.
      const plan = previewTransactionChange(editing.id, payload, rates)
      if (plan.corrections.length > 0 || plan.ratesMissing) {
        setPendingEdit({ payload, plan })
        return
      }
      applyEdit(payload, true)
      return
    }
    if (!addTransaction(payload)) {
      notify.error('El monto supera el Disponible de la cuenta')
      return
    }
    notify.success('Movimiento registrado')
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          <DialogDescription>Registra un ingreso o gasto en una de tus cuentas.</DialogDescription>
        </DialogHeader>

        {state.accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero debes crear al menos una cuenta.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {linkedItem && (
              <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Este gasto es la compra de <strong className="text-foreground">«{linkedItem.title}»</strong>.
                Puedes cambiar la categoría, la fecha y la nota; el monto, la cuenta y la comisión se
                mantienen. Para cambiarlos, deshaz la compra en tu lista y confírmala de nuevo.
              </p>
            )}

            <Field label="Tipo">
              <TypeToggle value={type} onChange={setType} disabled={moneyLocked} />
            </Field>

            <Field label="Cuenta">
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v as string)}
                disabled={moneyLocked}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const a = state.accounts.find((x) => x.id === val)
                      if (!a) return <span className="text-muted-foreground">Selecciona una cuenta</span>
                      const Icon = ACCOUNT_ICON_MAP[a.icon] ?? WalletIcon
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {a.name} · {getCurrency(a.currency).symbol}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {state.accounts.map((a) => {
                    const Icon = ACCOUNT_ICON_MAP[a.icon] ?? WalletIcon
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        <Icon className="size-4" />
                        {a.name} · {getCurrency(a.currency).symbol}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Categoría">
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const c = state.categories.find((x) => x.id === val)
                      if (!c) return <span className="text-muted-foreground">Selecciona una categoría</span>
                      const Icon = CATEGORY_ICON_MAP[c.icon] ?? DotsIcon
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" style={c.color ? { color: c.color } : undefined} />
                          {c.name}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const Icon = getCategoryIcon(c.icon)
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <Icon className="size-4" style={c.color ? { color: c.color } : undefined} />
                        {c.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Monto"
              preview={amountInput.showPreview ? <AmountPreview value={amountInput.evaluated!} /> : undefined}
            >
              <div className="flex gap-2">
                <Input
                  {...amountInput.inputProps}
                  placeholder="0,00"
                  autoFocus
                  className="flex-1"
                  disabled={moneyLocked}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCalcOpen(true)}
                  disabled={!accountId || moneyLocked}
                  title="Calcular monto con las tasas"
                >
                  <CalculatorIcon className="size-4" /> Calcular
                </Button>
              </div>
              {overBalance && (
                <span className="text-xs text-destructive">
                  El monto supera el Disponible de la cuenta.
                </span>
              )}
            </Field>

            <CommissionField
              hint={
                type === 'income'
                  ? 'Opcional. Se descuenta de lo recibido.'
                  : 'Opcional. Se suma al gasto.'
              }
              type={commissionType}
              onTypeChange={(t) => {
                setCommissionType(t)
                setCommissionTouched(true)
              }}
              value={commission}
              onValueChange={(v) => {
                setCommission(v)
                setCommissionTouched(true)
              }}
              currencySymbol={accountCurrency ? getCurrency(accountCurrency).symbol : undefined}
              disabled={moneyLocked}
            />

            <Field label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="Nota" hint="Opcional">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descripción del movimiento"
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {editing ? 'Guardar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!pendingEdit} onOpenChange={(o) => !o && setPendingEdit(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Guardar un cambio en un mes concluido</AlertDialogTitle>
          <AlertDialogDescription>
            El saldo de la cuenta se actualiza en cualquier caso. Elige qué hacer con el presupuesto de
            este mes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {pendingEdit && <CarryoverCorrectionsNotice plan={pendingEdit.plan} />}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {pendingEdit && pendingEdit.plan.corrections.length > 0 ? (
            <>
              <AlertDialogAction onClick={() => pendingEdit && applyEdit(pendingEdit.payload, false)}>
                Guardar y descartar
              </AlertDialogAction>
              <AlertDialogAction
                render={<Button />}
                onClick={() => pendingEdit && applyEdit(pendingEdit.payload, true)}
              >
                Guardar y añadir extra
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              render={<Button />}
              onClick={() => pendingEdit && applyEdit(pendingEdit.payload, false)}
            >
              Guardar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {accountCurrency && (
      <AmountCalculatorDialog
        open={calcOpen}
        onOpenChange={setCalcOpen}
        accountCurrency={accountCurrency}
        onPick={(value) => setAmount(value)}
      />
    )}
    </>
  )
}
