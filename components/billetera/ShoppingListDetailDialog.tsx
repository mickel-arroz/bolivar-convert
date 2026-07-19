'use client'

import { useMemo, useState } from 'react'
import { CurrencyId, CURRENCIES, getCurrency } from '@/constants/currencies'
import { Rates } from '@/constants/rates'
import { ShoppingList, ShoppingListItem, WalletApi } from '@/hooks/useWallet'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clampDigits } from '@/lib/numberInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CheckIcon, PlusIcon, PencilIcon, MaximizeIcon, MinimizeIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

interface ShoppingListDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  list: ShoppingList | null
  rates: Rates
  onAddItem: (listId: string) => void
  onEditList: (list: ShoppingList) => void
  onPurchase: (item: ShoppingListItem) => void
  onOpenItem: (item: ShoppingListItem) => void
}

type UsdRateSource = 'bcvUsd' | 'binanceUsdAvg' | 'custom'
type EurRateSource = 'bcvEur' | 'custom'

function rateNum(r: string | undefined): number {
  const n = parseFloat(String(r ?? '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export function ShoppingListDetailDialog({
  open,
  onOpenChange,
  wallet,
  list,
  rates,
  onAddItem,
  onEditList,
  onPurchase,
  onOpenItem,
}: ShoppingListDetailDialogProps) {
  const { state, undoPurchase } = wallet
  const [fullscreen, setFullscreen] = useState(false)

  const [totalCurrency, setTotalCurrency] = useState<CurrencyId>('VES')
  const [usdRateSource, setUsdRateSource] = useState<UsdRateSource>('bcvUsd')
  const [usdCustom, setUsdCustom] = useState('')
  const [eurRateSource, setEurRateSource] = useState<EurRateSource>('bcvEur')
  const [eurCustom, setEurCustom] = useState('')

  const items = useMemo(
    () => (list ? state.shoppingItems.filter((it) => it.listId === list.id) : []),
    [list, state.shoppingItems]
  )

  const subtotals = useMemo(() => {
    const acc: Partial<Record<CurrencyId, number>> = {}
    for (const it of items) {
      acc[it.currency] = (acc[it.currency] ?? 0) + (parseFloat(String(it.price).replace(',', '.')) || 0)
    }
    return acc
  }, [items])

  const usedCurrencies = useMemo(() => {
    const set = new Set<CurrencyId>(items.map((it) => it.currency))
    set.add(totalCurrency)
    return set
  }, [items, totalCurrency])

  const mixing = usedCurrencies.size > 1
  const needUsd = usedCurrencies.has('USD') && mixing
  const needEur = usedCurrencies.has('EUR') && mixing

  const usdRate = usdRateSource === 'custom' ? rateNum(usdCustom) : rateNum(rates[usdRateSource])
  const eurRate = eurRateSource === 'custom' ? rateNum(eurCustom) : rateNum(rates.bcvEur)

  const bsPerUnit = (cur: CurrencyId): number => {
    if (cur === 'VES') return 1
    if (cur === 'USD') return usdRate
    return eurRate
  }

  const missingRate = (needUsd && usdRate <= 0) || (needEur && eurRate <= 0)

  const total = useMemo(() => {
    if (missingRate) return null
    const rTo = bsPerUnit(totalCurrency)
    if (rTo <= 0) return null
    let sum = 0
    for (const it of items) {
      const price = parseFloat(String(it.price).replace(',', '.')) || 0
      const rFrom = bsPerUnit(it.currency)
      if (rFrom <= 0) return null
      sum += (price * rFrom) / rTo
    }
    return sum
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalCurrency, usdRate, eurRate, missingRate])

  if (!list) return null

  const purchasedCount = items.filter((it) => it.purchased).length
  const accent = list.color ?? DEFAULT_ACCOUNT_COLOR

  const handleOpenChange = (o: boolean) => {
    if (!o) setFullscreen(false)
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'size-interpolate duration-500',
          fullscreen
            ? 'h-[100dvh] w-screen max-h-[100dvh] max-w-[100vw] rounded-none border-0'
            : 'sm:max-w-2xl'
        )}
      >
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="absolute right-11 top-4 rounded-lg p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
        </button>

        <DialogHeader className="pr-16">
          <DialogTitle className="break-words">{list.name}</DialogTitle>
          <DialogDescription>
            {items.length === 0
              ? 'Aún no hay productos en esta lista.'
              : `${purchasedCount} de ${items.length} comprados.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onEditList(list)}>
              <PencilIcon className="size-4" /> Editar lista
            </Button>
            <Button size="sm" onClick={() => onAddItem(list.id)}>
              <PlusIcon className="size-4" /> Añadir producto
            </Button>
          </div>

          {items.length > 0 && (
            <ul className={cn('gap-2', fullscreen ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col')}>
              {items.map((it) => {
                const price = parseFloat(String(it.price).replace(',', '.')) || 0
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-foreground/30"
                  >
                    <button
                      type="button"
                      aria-label={it.purchased ? 'Marcar como no comprado' : 'Marcar como comprado'}
                      onClick={() => (it.purchased ? undoPurchase(it.id) : onPurchase(it))}
                      style={
                        it.purchased ? { backgroundColor: accent, borderColor: accent } : undefined
                      }
                      className={cn(
                        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all',
                        it.purchased
                          ? 'text-white'
                          : 'border-border/70 text-transparent hover:border-foreground/50'
                      )}
                    >
                      <CheckIcon className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenItem(it)}
                      className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'truncate font-bold',
                            it.purchased && 'text-muted-foreground line-through'
                          )}
                        >
                          {it.title}
                        </span>
                        <span className="shrink-0 text-sm font-black tabular-nums">
                          {formatMoney(price, it.currency)}
                        </span>
                      </div>
                      {it.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {it.description}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {items.length > 0 && (
            <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                <span className="font-bold uppercase tracking-wider">Estimado:</span>
                {(Object.entries(subtotals) as [CurrencyId, number][]).map(([cur, t]) => (
                  <span key={cur}>{formatMoney(t, cur)}</span>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Precio total
                  </span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-0.5">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTotalCurrency(c.id)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-bold transition-all',
                          totalCurrency === c.id
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {c.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                {needUsd && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">USD:</span>
                    {(
                      [
                        { id: 'bcvUsd', label: 'BCV' },
                        { id: 'binanceUsdAvg', label: 'Binance' },
                        { id: 'custom', label: 'Personalizada' },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setUsdRateSource(o.id)}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] font-bold transition-all',
                          usdRateSource === o.id
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                    {usdRateSource === 'custom' && (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={usdCustom}
                        onChange={(e) => setUsdCustom(clampDigits(e.target.value, { maxDecimals: 4 }))}
                        placeholder="Bs. por $"
                        className="h-7 w-28"
                      />
                    )}
                  </div>
                )}

                {needEur && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">EUR:</span>
                    {(
                      [
                        { id: 'bcvEur', label: 'BCV' },
                        { id: 'custom', label: 'Personalizada' },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setEurRateSource(o.id)}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] font-bold transition-all',
                          eurRateSource === o.id
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                    {eurRateSource === 'custom' && (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={eurCustom}
                        onChange={(e) => setEurCustom(clampDigits(e.target.value, { maxDecimals: 4 }))}
                        placeholder="Bs. por €"
                        className="h-7 w-28"
                      />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    en {getCurrency(totalCurrency).label}
                  </span>
                  <span className="text-lg font-black tabular-nums">
                    {total === null ? '—' : formatMoney(total, totalCurrency)}
                  </span>
                </div>
                {missingRate && (
                  <p className="text-xs text-destructive">
                    Indica una tasa de cambio para convertir todas las monedas.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
