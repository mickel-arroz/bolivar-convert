'use client'

import { createElement, useMemo, useState } from 'react'
import type { ShoppingList, ShoppingListItem } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'
import { CURRENCIES, getCurrency, type CurrencyId } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ListIcon, AlertIcon } from '@/components/icons'
import { parseAmount } from '@/lib/wallet/compute'
import { nextOverride, resolveDisplayCurrency } from '@/lib/wallet/displayCurrency'
import { computeAllListsTotals, type ResolvedRates } from '@/lib/wallet/shoppingTotals'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'
import { PriorityBreakdown, PriorityCards } from './PriorityBreakdown'

interface ShoppingSummaryButtonProps {
  lists: ShoppingList[]
  items: ShoppingListItem[]
  rates: Rates
  /** La **Moneda de visualización preferida** del usuario, punto de partida del selector. */
  preferredCurrency: CurrencyId
  /** Abre el detalle de una lista; el resumen se cierra para cederle la pantalla. */
  onOpenList: (listId: string) => void
}

/**
 * Botón de resumen global de listas de compras, con su modal.
 *
 * Solo se renderiza cuando existe al menos una lista con al menos un producto, esté
 * **Comprado** o no: quien ya compró todo conserva el botón, porque justo ahí es cuando
 * quiere revisar lo que gastó. El resumen convierte con las tasas BCV; su selector de
 * moneda es un override de sesión que se olvida al cerrar, para mirar la conversión sin
 * tocar la Moneda de visualización preferida. La fuente de tasa sigue perteneciendo a la
 * vista de detalle de una lista.
 */
export function ShoppingSummaryButton({
  lists,
  items,
  rates,
  preferredCurrency,
  onOpenList,
}: ShoppingSummaryButtonProps) {
  const [open, setOpen] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(true)
  const [currencyOverride, setCurrencyOverride] = useState<CurrencyId | undefined>(undefined)

  // Sin override elegido aquí, el bloque sigue la preferencia y sus cambios (ADR 0004).
  const displayCurrency = resolveDisplayCurrency(currencyOverride, preferredCurrency)

  const resolvedRates = useMemo<ResolvedRates>(
    () => ({ VES: 1, USD: parseAmount(rates.bcvUsd), EUR: parseAmount(rates.bcvEur) }),
    [rates.bcvUsd, rates.bcvEur]
  )

  const totals = useMemo(
    () => computeAllListsTotals(lists, items, resolvedRates, displayCurrency),
    [lists, items, resolvedRates, displayCurrency]
  )

  const accentByList = useMemo(
    () => new Map(lists.map((l) => [l.id, l.color ?? DEFAULT_ACCOUNT_COLOR])),
    [lists]
  )
  const iconByList = useMemo(() => new Map(lists.map((l) => [l.id, l.icon])), [lists])

  if (totals.rows.length === 0) return null

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setBreakdownOpen(true)
      setCurrencyOverride(undefined)
    }
    setOpen(o)
  }

  const handleOpenList = (listId: string) => {
    handleOpenChange(false)
    onOpenList(listId)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ListIcon /> Resumen
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92dvh] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resumen de compras</DialogTitle>
            <DialogDescription>
              Todas tus listas en {getCurrency(displayCurrency).label.toLowerCase()}, con la tasa
              BCV.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-3 flex justify-end">
            <div
              aria-label="Moneda del resumen"
              className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-0.5"
            >
              {CURRENCIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCurrencyOverride(nextOverride(c.id, preferredCurrency))}
                  className={cn(
                    'cursor-pointer rounded-md px-2.5 py-1 text-xs font-bold transition-all',
                    displayCurrency === c.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Dos listas por fila; una sola ocupa el ancho entero en vez de dejar un hueco. */}
          <div className={cn('grid gap-2', totals.rows.length > 1 && 'sm:grid-cols-2')}>
            {totals.rows.map((row) => {
              const accent = accentByList.get(row.listId) ?? DEFAULT_ACCOUNT_COLOR
              return (
                <div
                  key={row.listId}
                  data-testid="summary-list-row"
                  style={{ borderLeftColor: accent }}
                  className="flex flex-col gap-2 rounded-xl border border-l-2 border-border/60 p-3"
                >
                  {/* El Precio total baja a su propia línea mientras la columna sea
                      estrecha: al lado del nombre solo cabe en la grilla ancha. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                        color: accent,
                      }}
                    >
                      {createElement(getAccountIcon(iconByList.get(row.listId)), {
                        className: 'size-4',
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleOpenList(row.listId)}
                        className="block max-w-full cursor-pointer truncate rounded-sm text-left font-bold underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {row.name}
                      </button>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {row.purchased} comprados · {row.pending} por comprar
                      </p>
                    </div>
                    <span className="w-full shrink-0 text-right text-sm font-black tabular-nums lg:w-auto">
                      {row.total === null ? '—' : formatMoney(row.total, displayCurrency)}
                    </span>
                  </div>

                  {/* Un solo nivel no se desglosa, igual que el bloque global: el desglose
                      aparece cuando hay prioridades que comparar entre sí. */}
                  {row.byPriority.length > 1 && (
                    <PriorityCards
                      compact
                      byPriority={row.byPriority}
                      displayCurrency={displayCurrency}
                      testId="summary-list-priority"
                      className="grid-cols-2 lg:grid-cols-4"
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Resumen total
            </p>

            <PriorityBreakdown
              byPriority={totals.byPriority}
              displayCurrency={displayCurrency}
              open={breakdownOpen}
              onOpenChange={setBreakdownOpen}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Precio total de todas las listas</span>
              <span
                data-testid="summary-total"
                className="shrink-0 text-xl font-black tabular-nums"
              >
                {totals.total === null ? '—' : formatMoney(totals.total, displayCurrency)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-muted-foreground">
                Restante total por pagar
              </span>
              <span
                data-testid="summary-remaining"
                className="shrink-0 text-xl font-black tabular-nums text-primary"
              >
                {totals.remaining === null ? '—' : formatMoney(totals.remaining, displayCurrency)}
              </span>
            </div>

            {totals.incomplete && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertIcon className="mt-px size-3.5 shrink-0" />
                Falta una tasa de cambio: el total está incompleto.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
