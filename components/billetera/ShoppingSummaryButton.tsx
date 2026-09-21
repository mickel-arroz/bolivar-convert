'use client'

import { createElement, useMemo, useState } from 'react'
import type { ShoppingList, ShoppingListItem } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'
import { getCurrency, type CurrencyId } from '@/constants/currencies'
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
import { resolveDisplayCurrency } from '@/lib/wallet/displayCurrency'
import { computeAllListsTotals, type ResolvedRates } from '@/lib/wallet/shoppingTotals'
import { formatMoney } from './format'
import { PriorityBreakdown } from './PriorityBreakdown'

interface ShoppingSummaryButtonProps {
  lists: ShoppingList[]
  items: ShoppingListItem[]
  rates: Rates
  /** La **Moneda de visualización preferida** del usuario: este bloque no tiene override. */
  preferredCurrency: CurrencyId
}

/**
 * Botón de resumen global de listas de compras, con su modal.
 *
 * Solo se renderiza cuando existe al menos una lista con al menos un producto, esté
 * **Comprado** o no: quien ya compró todo conserva el botón, porque justo ahí es cuando
 * quiere revisar lo que gastó. El resumen convierte con las tasas BCV y la Moneda de
 * visualización preferida, sin selectores: los de moneda y fuente de tasa pertenecen a
 * la vista de detalle de una lista.
 */
export function ShoppingSummaryButton({
  lists,
  items,
  rates,
  preferredCurrency,
}: ShoppingSummaryButtonProps) {
  const [open, setOpen] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  // Sin override: este bloque sigue la preferencia, también cuando cambie (ADR 0004).
  const displayCurrency = resolveDisplayCurrency(undefined, preferredCurrency)

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
    if (!o) setBreakdownOpen(false)
    setOpen(o)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ListIcon /> Resumen
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resumen de compras</DialogTitle>
            <DialogDescription>
              Todas tus listas en {getCurrency(displayCurrency).label.toLowerCase()}, con la tasa
              BCV.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {totals.rows.map((row) => {
              const accent = accentByList.get(row.listId) ?? DEFAULT_ACCOUNT_COLOR
              return (
                <div
                  key={row.listId}
                  data-testid="summary-list-row"
                  style={{ borderLeftColor: accent }}
                  className="flex items-center gap-3 rounded-xl border border-l-2 border-border/60 p-3"
                >
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
                    <p className="truncate font-bold">{row.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {row.purchased} comprados · {row.pending} por comprar
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums">
                    {row.total === null ? '—' : formatMoney(row.total, displayCurrency)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
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
