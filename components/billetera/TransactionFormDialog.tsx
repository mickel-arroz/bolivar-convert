'use client'

import { useEffect, useMemo, useState } from 'react'
import { Transaction, TransactionType, WalletApi } from '@/hooks/useWallet'
import { getCurrency } from '@/constants/currencies'
import { getCategoryIcon, CATEGORY_ICON_MAP, ACCOUNT_ICON_MAP } from '@/constants/walletCategories'
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Field, TypeToggle } from './fields'
import { todayInputValue } from './format'
import { AmountCalculatorDialog } from './AmountCalculatorDialog'

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: Transaction | null
  defaultType?: TransactionType
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  wallet,
  editing,
  defaultType = 'expense',
}: TransactionFormDialogProps) {
  const { state, addTransaction, updateTransaction } = wallet
  const [type, setType] = useState<TransactionType>(defaultType)
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
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
      setNote(editing?.note ?? '')
      setDate(editing?.date ?? todayInputValue())
    }
  }, [open, editing, defaultType, state.accounts])

  const categories = useMemo(
    () => state.categories.filter((c) => c.kind === type),
    [state.categories, type]
  )

  // Si cambia el tipo y la categoría seleccionada ya no aplica, limpiarla
  useEffect(() => {
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId('')
    }
  }, [categories, categoryId])

  const accountCurrency = state.accounts.find((a) => a.id === accountId)?.currency
  const canSubmit = parseFloat(amount.replace(',', '.')) > 0 && accountId && categoryId

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = { type, accountId, categoryId, amount, note, date }
    if (editing) {
      updateTransaction(editing.id, payload)
    } else {
      addTransaction(payload)
    }
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
            <Field label="Tipo">
              <TypeToggle value={type} onChange={setType} />
            </Field>

            <Field label="Cuenta">
              <Select value={accountId} onValueChange={(v) => setAccountId(v as string)}>
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

            <Field label="Monto">
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCalcOpen(true)}
                  disabled={!accountId}
                  title="Calcular monto con las tasas"
                >
                  <CalculatorIcon className="size-4" /> Calcular
                </Button>
              </div>
            </Field>

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
