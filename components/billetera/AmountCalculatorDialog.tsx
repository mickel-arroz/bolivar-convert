'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRates } from '@/hooks/useRates'
import { CurrencyId, getCurrency } from '@/constants/currencies'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Field, AmountField } from './fields'
import { formatMoney } from './format'

interface AmountCalculatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Moneda de la cuenta del movimiento: los resultados quedan en esta moneda. */
  accountCurrency: CurrencyId
  /** Se llama con el valor elegido (en la moneda de la cuenta) para rellenar el input. */
  onPick: (value: string) => void
}

function rateNum(r: string | undefined): number {
  const n = parseFloat(String(r ?? '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export function AmountCalculatorDialog({
  open,
  onOpenChange,
  accountCurrency,
  onPick,
}: AmountCalculatorDialogProps) {
  const { rates } = useRates()
  const [amount, setAmount] = useState('')
  const [customRate, setCustomRate] = useState('')
  // Solo para cuentas en Bs.: moneda extranjera desde la que se convierte.
  const [sourceForeign, setSourceForeign] = useState<Extract<CurrencyId, 'USD' | 'EUR'>>('USD')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount('')
      setCustomRate('')
      setSourceForeign('USD')
    }
  }, [open])

  // La moneda extranjera involucrada define qué tasas aplican.
  const foreignCur: Extract<CurrencyId, 'USD' | 'EUR'> =
    accountCurrency === 'VES' ? sourceForeign : (accountCurrency as 'USD' | 'EUR')
  // Moneda en la que el usuario escribe el monto a convertir.
  const sourceCurrency: CurrencyId = accountCurrency === 'VES' ? sourceForeign : 'VES'

  const amt = parseFloat(amount.replace(',', '.')) || 0

  // Convierte `amt` (en sourceCurrency) a la moneda de la cuenta usando una tasa Bs/extranjera.
  const convert = (rate: number): number | null => {
    if (rate <= 0) return null
    return accountCurrency === 'VES' ? amt * rate : amt / rate
  }

  const options = useMemo(() => {
    const list: { key: string; label: string; rate: number }[] = []
    if (foreignCur === 'USD') {
      list.push({ key: 'bcvUsd', label: 'BCV', rate: rateNum(rates.bcvUsd) })
      list.push({ key: 'binance', label: 'Binance', rate: rateNum(rates.binanceUsdAvg) })
    } else {
      list.push({ key: 'bcvEur', label: 'BCV', rate: rateNum(rates.bcvEur) })
    }
    list.push({ key: 'custom', label: 'Personalizada', rate: rateNum(customRate) })
    return list
  }, [foreignCur, rates, customRate])

  const handlePick = (value: number) => {
    onPick(String(Math.round(value * 100) / 100))
    onOpenChange(false)
  }

  const sourceSymbol = getCurrency(sourceCurrency).symbol
  const accountSymbol = getCurrency(accountCurrency).symbol

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calcular monto</DialogTitle>
          <DialogDescription>
            Convierte un monto a {getCurrency(accountCurrency).label} y toca una tasa para usarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {accountCurrency === 'VES' && (
            <Field label="Convertir desde">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
                {(['USD', 'EUR'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSourceForeign(c)}
                    className={cn(
                      'rounded-md py-1.5 text-sm font-bold transition-all',
                      sourceForeign === c
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {getCurrency(c).symbol} {getCurrency(c).label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <AmountField
              label="Monto a convertir"
              hint={sourceSymbol}
              value={amount}
              onValueChange={setAmount}
              autoFocus
            />
            <AmountField
              label="Tasa personalizada"
              hint="Bs. (opcional)"
              value={customRate}
              onValueChange={setCustomRate}
              maxDecimals={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Resultado en {accountSymbol}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.map((opt) => {
                const result = convert(opt.rate)
                const disabled = result === null || amt <= 0
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => result !== null && handlePick(result)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all',
                      disabled
                        ? 'border-border/40 opacity-50'
                        : 'border-border/60 hover:border-primary/40 hover:bg-primary/5'
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {opt.rate > 0 ? `${opt.rate.toFixed(2)} Bs.` : 'Sin tasa'}
                      </span>
                    </div>
                    <span className="shrink-0 text-base font-black tabular-nums">
                      {result !== null ? formatMoney(result, accountCurrency) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
