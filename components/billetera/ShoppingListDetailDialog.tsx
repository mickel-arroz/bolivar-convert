'use client'

import { createElement, useMemo, useState } from 'react'
import { CurrencyId, CURRENCIES, getCurrency } from '@/constants/currencies'
import { Rates } from '@/constants/rates'
import {
  ShoppingList,
  ShoppingListItem,
  WalletApi,
  UndoPurchasePlan,
  formatMonthLabel,
} from '@/hooks/useWallet'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { getAccountIcon } from '@/constants/walletCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useMathInput } from '@/hooks/useMathInput'
import { useIsCompactScreen } from '@/hooks/useMediaQuery'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MaximizeIcon,
  MinimizeIcon,
  SearchIcon,
  ShoppingCartIcon,
} from '@/components/icons'
import { PRIORITY_COLORS, PRIORITY_LABELS, normalizePriority } from '@/constants/shoppingPriority'
import { computeShoppingTotals, type ResolvedRates } from '@/lib/wallet/shoppingTotals'
import { filterShoppingItems } from '@/lib/wallet/shoppingSearch'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { formatMoney } from './format'
import { nextOverride, resolveDisplayCurrency } from '@/lib/wallet/displayCurrency'
import { PriorityBreakdown } from './PriorityBreakdown'

interface ShoppingListDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  list: ShoppingList | null
  rates: Rates
  onAddItem: (listId: string) => void
  onEditList: (list: ShoppingList) => void
  onDeleteList: (list: ShoppingList) => void
  onPurchase: (item: ShoppingListItem) => void
  onOpenItem: (item: ShoppingListItem) => void
}

type UsdRateSource = 'bcvUsd' | 'binanceUsdAvg' | 'custom'
type EurRateSource = 'bcvEur' | 'custom'

function rateNum(r: string | undefined): number {
  const n = parseFloat(String(r ?? '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly { id: T; label: string }[]
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-bold transition-all',
            value === o.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ShoppingListDetailDialog({
  open,
  onOpenChange,
  wallet,
  list,
  rates,
  onAddItem,
  onEditList,
  onDeleteList,
  onPurchase,
  onOpenItem,
}: ShoppingListDetailDialogProps) {
  const { state, undoPurchase, previewUndoPurchase, updateShoppingList } = wallet
  const [expanded, setFullscreen] = useState(false)
  const compact = useIsCompactScreen()
  const fullscreen = expanded || compact
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setQuery('')
  }
  // Deshacer una compra de un mes ya concluido pregunta qué hacer con el dinero.
  const [pendingUndo, setPendingUndo] = useState<{
    item: ShoppingListItem
    plan: Extract<UndoPurchasePlan, { kind: 'carryover' }>
  } | null>(null)

  const totalCurrency = resolveDisplayCurrency(list?.totalCurrencyOverride, state.displayCurrency)
  const setTotalCurrency = (c: CurrencyId) => {
    if (!list) return
    updateShoppingList(list.id, { totalCurrencyOverride: nextOverride(c, state.displayCurrency) })
  }
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
        // Los comprados van al final; entre ellos (y entre los pendientes) se mantiene
        // el orden por prioridad.
        if (a.purchased !== b.purchased) return a.purchased ? 1 : -1
        const pr = normalizePriority(a.priority) - normalizePriority(b.priority)
        if (pr !== 0) return pr
        const price = priceOf(a) - priceOf(b)
        if (price !== 0) return price
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
      })
  }, [list, state.shoppingItems])

  const visibleItems = useMemo(() => filterShoppingItems(items, query), [items, query])

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

  const notifyUndo = (res: ReturnType<typeof undoPurchase>) => {
    if (res.kind === 'carryover') {
      notify.success(
        'Compra deshecha',
        `${formatMoney(res.amount, res.currency)} vuelven como extra al presupuesto de este mes.`
      )
    } else if (res.kind === 'discarded') {
      notify.success('Compra deshecha', 'El gasto se descartó: el presupuesto de este mes no cambió.')
    } else if (res.kind === 'ratesMissing') {
      notify.error(
        'Compra deshecha, pero falta la tasa',
        'No se pudo devolver el gasto como extra al presupuesto de este mes. Ajústalo a mano.'
      )
    } else if (res.kind === 'plain') {
      notify.success('Compra deshecha')
    }
  }

  const handleUndo = (it: ShoppingListItem) => {
    const plan = previewUndoPurchase(it.id, rates)
    if (plan.kind === 'carryover') {
      setPendingUndo({ item: it, plan })
      return
    }
    notifyUndo(undoPurchase(it.id, rates))
  }

  const confirmUndo = (addExtra: boolean) => {
    if (!pendingUndo) return
    notifyUndo(undoPurchase(pendingUndo.item.id, rates, addExtra))
    setPendingUndo(null)
  }

  const purchasedCount = items.filter((it) => it.purchased).length
  const accent = list.color ?? DEFAULT_ACCOUNT_COLOR
  const sections = [
    { key: 'pending', title: 'Pendientes', items: visibleItems.filter((it) => !it.purchased) },
    { key: 'purchased', title: 'Comprados', items: visibleItems.filter((it) => it.purchased) },
  ].filter((s) => s.items.length > 0)

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setFullscreen(false)
      setBreakdownOpen(false)
    }
    onOpenChange(o)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'size-interpolate duration-500',
          fullscreen
            ? 'h-[100dvh] w-screen max-h-[100dvh] max-w-[100vw] rounded-none border-0'
            : 'sm:max-w-2xl'
        )}
        actions={
          !compact && (
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="rounded-full p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
            </button>
          )
        }
      >
        <DialogHeader className={cn('gap-3', compact ? 'pr-8' : 'pr-16')}>
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                color: accent,
              }}
            >
              {createElement(getAccountIcon(list.icon), { className: 'size-5' })}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="break-words leading-tight">{list.name}</DialogTitle>
              <DialogDescription className="text-xs tabular-nums">
                {items.length === 0
                  ? 'Aún no hay productos en esta lista.'
                  : `${purchasedCount} de ${items.length} comprados.`}
              </DialogDescription>
            </div>
          </div>
          {items.length > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(purchasedCount / items.length) * 100}%`, backgroundColor: accent }}
              />
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {items.length > 0 && (
              <div className="relative min-w-48 flex-1">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos"
                  aria-label="Buscar productos"
                  className="pl-8"
                />
              </div>
            )}
            <div className={cn('flex items-center gap-1', items.length === 0 && 'flex-1')}>
              <Button variant="ghost" size="icon-sm" onClick={() => onEditList(list)} aria-label="Editar lista">
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:text-destructive"
                onClick={() => onDeleteList(list)}
                aria-label="Eliminar lista"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
            <Button size="sm" className="ml-auto" onClick={() => onAddItem(list.id)}>
              <PlusIcon className="size-4" /> Añadir producto
            </Button>
          </div>

          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <div
                className="flex size-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in oklch, ${accent} 14%, transparent)`,
                  color: accent,
                }}
              >
                <ShoppingCartIcon className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                Añade el primer producto para empezar a planificar tus compras.
              </p>
            </div>
          )}

          {items.length > 0 && visibleItems.length === 0 && (
            <p className="break-words py-6 text-center text-sm text-muted-foreground">
              Ningún producto coincide con &quot;{query.trim()}&quot;
            </p>
          )}

          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {section.title}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                  {section.items.length}
                </span>
              </h3>
              <ul className={cn('gap-2', fullscreen ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col')}>
                {section.items.map((it) => {
                  const price = parseFloat(String(it.price).replace(',', '.')) || 0
                  const pr = normalizePriority(it.priority)
                  const prColor = PRIORITY_COLORS[pr]
                  return (
                    <li
                      key={it.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/5 transition-colors hover:bg-muted/60',
                        it.purchased && 'opacity-60'
                      )}
                    >
                      <button
                        type="button"
                        aria-label={it.purchased ? 'Marcar como no comprado' : 'Marcar como comprado'}
                        onClick={() => (it.purchased ? handleUndo(it) : onPurchase(it))}
                        style={
                          it.purchased
                            ? { backgroundColor: accent, borderColor: accent }
                            : { borderColor: `color-mix(in oklch, ${accent} 55%, transparent)` }
                        }
                        className={cn(
                          'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all',
                          it.purchased ? 'text-white' : 'text-transparent hover:text-muted-foreground'
                        )}
                      >
                        <CheckIcon className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenItem(it)}
                        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm font-bold',
                              it.purchased && 'text-muted-foreground line-through'
                            )}
                          >
                            {it.title}
                          </span>
                          <span className="shrink-0 text-sm font-black tabular-nums">
                            {formatMoney(price, it.currency)}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            title={`Prioridad ${pr} · ${PRIORITY_LABELS[pr]}`}
                            className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                            style={{
                              backgroundColor: `color-mix(in oklch, ${prColor} 16%, transparent)`,
                              color: prColor,
                            }}
                          >
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: prColor }} />
                            {PRIORITY_LABELS[pr]}
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
            </section>
          ))}

          {items.length > 0 && (
            <div
              style={{ boxShadow: `0 0 0 1px color-mix(in oklch, ${accent} 35%, transparent)` }}
              className="mt-auto flex flex-col gap-3 rounded-xl bg-muted/30 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Precio total
                </span>
                <Segmented
                  value={totalCurrency}
                  onChange={setTotalCurrency}
                  options={CURRENCIES.map((c) => ({ id: c.id, label: c.symbol }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 rounded-lg bg-background/60 px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    en {getCurrency(totalCurrency).label}
                  </span>
                  <span className="truncate text-lg font-black tabular-nums sm:text-xl">
                    {totals.total === null ? '—' : formatMoney(totals.total, totalCurrency)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg bg-background/60 px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Restante por pagar</span>
                  <span className="truncate text-lg font-black tabular-nums text-primary sm:text-xl">
                    {totals.remaining === null ? '—' : formatMoney(totals.remaining, totalCurrency)}
                  </span>
                </div>
              </div>

              {missingRate && (
                <p className="text-xs font-semibold text-destructive">
                  Indica una tasa de cambio para convertir todas las monedas.
                </p>
              )}

              {/* Estimado: subtotales por moneda de los productos de la lista. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tabular-nums">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Estimado</span>
                {(Object.entries(subtotals) as [CurrencyId, number][]).map(([cur, t]) => (
                  <span key={cur} className="rounded-md bg-background/60 px-1.5 py-0.5 font-semibold text-foreground">
                    {formatMoney(t, cur)}
                  </span>
                ))}
              </div>

              {(needUsd || needEur) && (
                <div className="flex flex-col gap-2 rounded-lg bg-background/40 p-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tasa de cambio
                  </span>
                  {needUsd && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-8 text-xs font-bold text-muted-foreground">USD</span>
                      <Segmented
                        value={usdRateSource}
                        onChange={setUsdRateSource}
                        options={[
                          { id: 'bcvUsd', label: 'BCV' },
                          { id: 'binanceUsdAvg', label: 'Binance' },
                          { id: 'custom', label: 'Personalizada' },
                        ]}
                      />
                      {usdRateSource === 'custom' && (
                        <Input {...usdCustomInput.inputProps} placeholder="Bs. por $" className="h-8 w-28" />
                      )}
                    </div>
                  )}
                  {needEur && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-8 text-xs font-bold text-muted-foreground">EUR</span>
                      <Segmented
                        value={eurRateSource}
                        onChange={setEurRateSource}
                        options={[
                          { id: 'bcvEur', label: 'BCV' },
                          { id: 'custom', label: 'Personalizada' },
                        ]}
                      />
                      {eurRateSource === 'custom' && (
                        <Input {...eurCustomInput.inputProps} placeholder="Bs. por €" className="h-8 w-28" />
                      )}
                    </div>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!pendingUndo} onOpenChange={(o) => !o && setPendingUndo(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deshacer una compra de un mes concluido</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingUndo && (
              <>
                «{pendingUndo.item.title}» se pagó en {formatMonthLabel(pendingUndo.plan.month)}, un mes
                que ya concluiste: su sobrante se calculó con este gasto incluido. Al deshacerla, el
                saldo de la cuenta sube en cualquier caso. ¿Qué hacemos con los{' '}
                <strong>{formatMoney(pendingUndo.plan.amount, pendingUndo.plan.currency)}</strong>{' '}
                en el presupuesto?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {pendingUndo && (
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Añadir como extra:</strong> se suman al presupuesto
              de {pendingUndo.plan.categoryName} de este mes.
            </li>
            <li>
              <strong className="text-foreground">Descartar:</strong> el presupuesto de este mes queda
              como está.
            </li>
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => confirmUndo(false)}>Descartar</AlertDialogAction>
          <AlertDialogAction render={<Button />} onClick={() => confirmUndo(true)}>
            Añadir como extra
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
