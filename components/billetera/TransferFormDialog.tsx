'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates, RateId } from '@/constants/rates'
import { getCurrency } from '@/constants/currencies'
import { TransferRateSource, CommissionType, WalletApi, convertTransferAmount } from '@/hooks/useWallet'
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
import { Field, AmountField, CommissionField } from './fields'
import { useMathInput, formatPreview } from '@/hooks/useMathInput'
import { notify } from '@/lib/notify'
import { todayInputValue } from './format'

interface TransferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  rates: Rates
}

function rateNum(r: string | undefined): number {
  const n = parseFloat(r ?? '0')
  return isNaN(n) ? 0 : n
}

export function TransferFormDialog({ open, onOpenChange, wallet, rates }: TransferFormDialogProps) {
  const { state, addTransfer } = wallet
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  // true cuando el usuario edita manualmente el monto a recibir (deja de autocompletarse)
  const [toAmountEdited, setToAmountEdited] = useState(false)
  const [rateSource, setRateSource] = useState<TransferRateSource>('custom')
  const [customRate, setCustomRate] = useState('')
  const [commission, setCommission] = useState('')
  const [commissionType, setCommissionType] = useState<CommissionType>('percent')
  const [commissionTouched, setCommissionTouched] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayInputValue())

  const fromAcc = state.accounts.find((a) => a.id === fromAccountId)
  const toAcc = state.accounts.find((a) => a.id === toAccountId)
  const fromCur = fromAcc?.currency
  const toCur = toAcc?.currency
  const differentCur = !!fromCur && !!toCur && fromCur !== toCur
  const involvesVes = fromCur === 'VES' || toCur === 'VES'
  const foreignCur = fromCur === 'VES' ? toCur : fromCur

  // Opciones de tasa de la app aplicables según las monedas involucradas
  const appRateOptions = useMemo(() => {
    const opts: { source: RateId; label: string; value: number }[] = []
    if (differentCur && involvesVes) {
      if (foreignCur === 'USD') {
        opts.push({ source: 'bcvUsd', label: 'BCV', value: rateNum(rates.bcvUsd) })
        opts.push({ source: 'binanceUsdAvg', label: 'Binance', value: rateNum(rates.binanceUsdAvg) })
      } else if (foreignCur === 'EUR') {
        opts.push({ source: 'bcvEur', label: 'BCV', value: rateNum(rates.bcvEur) })
      }
    }
    return opts
  }, [differentCur, involvesVes, foreignCur, rates])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromAccountId(state.accounts[0]?.id ?? '')
      setToAccountId(state.accounts[1]?.id ?? '')
      setFromAmount('')
      setToAmount('')
      setToAmountEdited(false)
      setCustomRate('')
      setCommission('')
      setCommissionType('percent')
      setCommissionTouched(false)
      setNote('')
      setDate(todayInputValue())
    }
  }, [open, state.accounts])

  useEffect(() => {
    if (!open || commissionTouched) return
    const acc = state.accounts.find((a) => a.id === fromAccountId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommission(acc?.commission ?? '')
    setCommissionType(acc?.commissionType ?? 'percent')
  }, [open, commissionTouched, fromAccountId, state.accounts])

  // Cuando cambian las cuentas, elegir una fuente de tasa válida por defecto
  useEffect(() => {
    if (appRateOptions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRateSource(appRateOptions[0].source)
    } else {
      setRateSource('custom')
    }
  }, [appRateOptions])

  const rateValue = useMemo(() => {
    if (!differentCur) return 0
    if (rateSource === 'custom') {
      const n = parseFloat(customRate.replace(',', '.'))
      return isNaN(n) ? 0 : n
    }
    return rateNum(rates[rateSource])
  }, [differentCur, rateSource, customRate, rates])

  const amountNum = parseFloat(fromAmount.replace(',', '.')) || 0
  const converted =
    fromCur && toCur
      ? differentCur
        ? convertTransferAmount(amountNum, fromCur, toCur, rateValue)
        : amountNum
      : 0

  // Autocompletar el monto a recibir con la conversión, salvo que el usuario lo edite.
  useEffect(() => {
    if (!toAmountEdited) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToAmount(converted > 0 ? String(Math.round(converted * 100) / 100) : '')
    }
  }, [converted, toAmountEdited])

  const receivedNum = parseFloat(toAmount.replace(',', '.')) || 0
  const fromSymbol = fromCur ? getCurrency(fromCur).symbol : ''
  const toSymbol = toCur ? getCurrency(toCur).symbol : ''

  const canSubmit =
    !!fromAccountId &&
    !!toAccountId &&
    fromAccountId !== toAccountId &&
    amountNum > 0 &&
    receivedNum > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const commissionValue = commission.trim() || undefined
    addTransfer({
      fromAccountId,
      toAccountId,
      fromAmount,
      toAmount,
      rateSource,
      rateValue,
      commission: commissionValue,
      commissionType: commissionValue ? commissionType : undefined,
      note,
      date,
    })
    notify.success('Traspaso registrado')
    onOpenChange(false)
  }

  const customRateInput = useMathInput(customRate, setCustomRate, { maxDecimals: 4 })

  const customRateLabel =
    differentCur && fromCur && toCur
      ? involvesVes
        ? `Bs. por ${getCurrency(foreignCur!).symbol}`
        : `1 ${getCurrency(fromCur).symbol} = ? ${getCurrency(toCur).symbol}`
      : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Traspaso entre cuentas</DialogTitle>
          <DialogDescription>
            Mueve dinero entre tus cuentas, incluso con monedas distintas.
          </DialogDescription>
        </DialogHeader>

        {state.accounts.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas al menos dos cuentas para hacer un traspaso.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Desde">
              <Select value={fromAccountId} onValueChange={(v) => setFromAccountId(v as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const a = state.accounts.find((x) => x.id === val)
                      if (!a) return <span className="text-muted-foreground">Cuenta origen</span>
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

            <Field label="Hacia">
              <Select value={toAccountId} onValueChange={(v) => setToAccountId(v as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {(val) => {
                      const a = state.accounts.find((x) => x.id === val)
                      if (!a) return <span className="text-muted-foreground">Cuenta destino</span>
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
                  {state.accounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((a) => {
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

            <div className="grid grid-cols-2 gap-3">
              <AmountField
                label="Monto a enviar"
                hint={fromSymbol || undefined}
                value={fromAmount}
                onValueChange={setFromAmount}
              />
              <AmountField
                label="Monto a recibir"
                hint={toSymbol || undefined}
                value={toAmount}
                onValueChange={(v) => {
                  setToAmount(v)
                  setToAmountEdited(true)
                }}
              />
            </div>

            {differentCur && (
              <Field
                label="Tasa de cambio"
                preview={
                  rateSource === 'custom' && customRateInput.showPreview ? (
                    <span className="mr-2 text-xs font-bold tabular-nums text-primary">
                      = {formatPreview(customRateInput.evaluated!, 4)}
                    </span>
                  ) : undefined
                }
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {appRateOptions.map((opt) => (
                      <button
                        key={opt.source}
                        type="button"
                        onClick={() => setRateSource(opt.source)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                          rateSource === opt.source
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.label} {opt.value > 0 ? opt.value.toFixed(2) : '—'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRateSource('custom')}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                        rateSource === 'custom'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Personalizada
                    </button>
                  </div>
                  {rateSource === 'custom' && (
                    <Input {...customRateInput.inputProps} placeholder={customRateLabel} />
                  )}
                </div>
              </Field>
            )}

            <CommissionField
              hint={`Opcional. La paga la cuenta origen${fromSymbol ? ` (${fromSymbol})` : ''}.`}
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
              currencySymbol={fromSymbol || undefined}
            />

            <Field label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="Nota" hint="Opcional">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo del traspaso" />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Traspasar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
