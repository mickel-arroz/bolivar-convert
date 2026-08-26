'use client'

import { useMemo, useState } from 'react'
import { CurrencyId, CURRENCIES, getCurrency } from '@/constants/currencies'
import { Rates } from '@/constants/rates'
import { ShoppingList, ShoppingListItem, WalletApi } from '@/hooks/useWallet'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMathInput } from '@/hooks/useMathInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CheckIcon, PlusIcon, PencilIcon, MaximizeIcon, MinimizeIcon } from '@/components/icons'
import { PRIORITY_COLORS, PRIORITY_LABELS, normalizePriority } from '@/constants/shoppingPriority'
import { computeShoppingTotals, type ResolvedRates } from '@/lib/wallet/shoppingTotals'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'
import { PriorityBreakdown } from './PriorityBreakdown'

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
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const [totalCurrency, setTotalCurrency] = useState<CurrencyId>('VES')
  const [usdRateSource, setUsdRateSource] = useState<UsdRateSource>('bcvUsd')
  const [usdCustom, setUsdCustom] = useState('')
  const [eurRateSource, setEurRateSource] = useState<EurRateSource>('bcvEur')
  const [eurCustom, setEurCustom] = useState('')

  const items = useMemo(() => {
    if (!list) return []
    const priceOf = (it: ShoppingListItem) => parseFloat(String(it.price).replace(',', '.')) || 0
    return state.shoppingItems
      .filter((it) => it.listId === list.id)
      .sort((a, b) => {
        const pr = normalizePriority(a.priority) - normalizePriority(b.priority)
        if (pr !== 0) return pr
        const price = priceOf(a) - priceOf(b)
        if (price !== 0) return price
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
      })
  }, [list, state.shoppingItems])

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

  const resolvedRates = useMemo<ResolvedRates>(
    () => ({ VES: 1, USD: usdRate, EUR: eurRate }),
    [usdRate, eurRate]
  )

  const missingRate = (needUsd && usdRate <= 0) || (needEur && eurRate <= 0)

  const totals = useMemo(
    () => computeShoppingTotals(items, resolvedRates, totalCurrency),
    [items, resolvedRates, totalCurrency]
  )

  const usdCustomInput = useMathInput(usdCustom, setUsdCustom, { maxDecimals: 4 })
  const eurCustomInput = useMathInput(eurCustom, setEurCustom, { maxDecimals: 4 })

  if (!list) return null

  const purchasedCount = items.filter((it) => it.purchased).length
  const accent = list.color ?? DEFAULT_ACCOUNT_COLOR

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setFullscreen(false)
      setBreakdownOpen(false)
    }
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
          <DialogTitle className="flex items-center gap-2 break-words">
            <span
              aria-hidden
              className="inline-block size-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: accent }}
            />
            {list.name}
          </DialogTitle>
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
                const pr = normalizePriority(it.priority)
                return (
                  <li
                    key={it.id}
                    style={{ borderLeftColor: accent }}
                    className="flex items-center gap-3 rounded-xl border border-l-2 border-border/60 p-3 transition-colors hover:border-foreground/30"
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
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          title={`Prioridad ${pr} · ${PRIORITY_LABELS[pr]}`}
                          className="flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold leading-none text-white"
                          style={{ backgroundColor: PRIORITY_COLORS[pr] }}
                        >
                          {pr}
                        </span>
                        {it.description && (
                          <span className="truncate text-xs text-muted-foreground">
                            {it.description}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {items.length > 0 && (
            <div className="mt-auto border-t border-border/60 pt-3">
              <div
                style={{ boxShadow: `0 0 0 1px color-mix(in oklch, ${accent} 35%, transparent)` }}
                className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3"
              >
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

                {/* Estimado: subtotales por moneda de los productos de la lista. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tabular-nums">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Estimado
                  </span>
                  {(Object.entries(subtotals) as [CurrencyId, number][]).map(([cur, t]) => (
                    <span
                      key={cur}
                      className="rounded-md bg-muted/60 px-1.5 py-0.5 font-semibold text-foreground"
                    >
                      {formatMoney(t, cur)}
                    </span>
                  ))}
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
                      <Input {...usdCustomInput.inputProps} placeholder="Bs. por $" className="h-7 w-28" />
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
                      <Input {...eurCustomInput.inputProps} placeholder="Bs. por €" className="h-7 w-28" />
                    )}
                  </div>
                )}

                <div className="h-px bg-border/60" />

                <PriorityBreakdown
                  byPriority={totals.byPriority}
                  displayCurrency={totalCurrency}
                  open={breakdownOpen}
                  onOpenChange={setBreakdownOpen}
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    en {getCurrency(totalCurrency).label}
                  </span>
                  <span className="text-xl font-black tabular-nums">
                    {totals.total === null ? '—' : formatMoney(totals.total, totalCurrency)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Restante por pagar</span>
                  <span className="text-xl font-black tabular-nums text-primary">
                    {totals.remaining === null ? '—' : formatMoney(totals.remaining, totalCurrency)}
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
