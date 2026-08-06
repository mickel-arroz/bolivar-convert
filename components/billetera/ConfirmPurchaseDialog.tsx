'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rates, RateId } from '@/constants/rates'
import { getCurrency } from '@/constants/currencies'
import { ShoppingListItem, TransferRateSource, WalletApi, convertTransferAmount } from '@/hooks/useWallet'
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
import { Field, AmountField } from './fields'
import { useMathInput, formatPreview } from '@/hooks/useMathInput'
import { notify } from '@/lib/notify'
import { formatMoney, todayInputValue } from './format'

interface ConfirmPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  item: ShoppingListItem | null
  rates: Rates
}

function rateNum(r: string | undefined): number {
  const n = parseFloat(r ?? '0')
  return isNaN(n) ? 0 : n
}

export function ConfirmPurchaseDialog({
  open,
  onOpenChange,
  wallet,
  item,
  rates,
}: ConfirmPurchaseDialogProps) {
  const { state, accountBalances, confirmPurchase } = wallet
  const [accountId, setAccountId] = useState('')
  const [cost, setCost] = useState('')
  const [rateSource, setRateSource] = useState<TransferRateSource>('custom')
  const [customRate, setCustomRate] = useState('')
  const [date, setDate] = useState(todayInputValue())

  const balanceByAccount = useMemo(
    () => new Map(accountBalances.map((b) => [b.accountId, b.balance])),
    [accountBalances]
  )

  const account = state.accounts.find((a) => a.id === accountId)
  const itemCur = item?.currency
  const accCur = account?.currency
  const differentCur = !!itemCur && !!accCur && itemCur !== accCur
  const involvesVes = itemCur === 'VES' || accCur === 'VES'
  const foreignCur = itemCur === 'VES' ? accCur : itemCur

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
    if (open && item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountId(state.accounts[0]?.id ?? '')
      setCost(item.price || '')
      setCustomRate('')
      setDate(todayInputValue())
    }
  }, [open, item, state.accounts])

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

  const customRateInput = useMathInput(customRate, setCustomRate, { maxDecimals: 4 })

  if (!item) return null

  const costNum = parseFloat(cost.replace(',', '.')) || 0
  const debited =
    itemCur && accCur ? (differentCur ? convertTransferAmount(costNum, itemCur, accCur, rateValue) : costNum) : 0
  const accountBalance = balanceByAccount.get(accountId) ?? 0
  const overBalance = !!accCur && debited > accountBalance + 1e-6
  const canSubmit = !!accountId && costNum > 0 && (!differentCur || rateValue > 0) && !overBalance

  const customRateLabel =
    differentCur && itemCur && accCur
      ? involvesVes
        ? `Bs. por ${getCurrency(foreignCur!).symbol}`
        : `1 ${getCurrency(itemCur).symbol} = ? ${getCurrency(accCur).symbol}`
      : ''

  const handleSubmit = () => {
    if (!canSubmit) return
    const ok = confirmPurchase({ itemId: item.id, accountId, cost, rateSource, rateValue, date })
    if (!ok) {
      notify.error('El monto supera el saldo de la cuenta')
      return
    }
    notify.success('Compra confirmada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar compra</DialogTitle>
          <DialogDescription>
            «{item.title}» — indica con qué cuenta pagaste. Se registrará como un gasto en
            «Compras».
          </DialogDescription>
        </DialogHeader>

        {state.accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas al menos una cuenta para registrar la compra.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
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
                          {a.name} · {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency)}
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
                        {a.name} · {formatMoney(balanceByAccount.get(a.id) ?? 0, a.currency)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <AmountField
                label="Costo"
                hint={itemCur ? getCurrency(itemCur).symbol : undefined}
                value={cost}
                onValueChange={setCost}
                autoFocus
              />
              <Field label="Fecha">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
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

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Se debitará de la cuenta</span>
                <span className="font-black tabular-nums">
                  {accCur ? formatMoney(debited, accCur) : '—'}
                </span>
              </div>
              {differentCur && rateValue <= 0 && (
                <p className="mt-1 text-xs text-destructive">
                  Indica una tasa de cambio para convertir a la moneda de la cuenta.
                </p>
              )}
              {overBalance && (
                <p className="mt-1 text-xs text-destructive">
                  El monto supera el saldo de la cuenta.
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
            Confirmar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
