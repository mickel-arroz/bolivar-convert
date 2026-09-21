'use client'

import { CurrencyId } from '@/constants/currencies'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/shoppingPriority'
import type { PriorityTotal } from '@/lib/wallet/shoppingTotals'
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible'
import { ChevronDownIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

interface PriorityBreakdownProps {
  byPriority: PriorityTotal[]
  displayCurrency: CurrencyId
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Una prioridad está cubierta cuando ya no le queda nada por pagar. */
function isCovered(row: PriorityTotal): boolean {
  return row.remaining === 0
}

/** Porcentaje ya comprado de una prioridad. 0 si no hay cifras o el total es cero. */
function purchasedPercent(row: PriorityTotal): number {
  if (row.total === null || row.remaining === null || row.total <= 0) return 0
  return Math.min(100, Math.max(0, ((row.total - row.remaining) / row.total) * 100))
}

interface PriorityCardsProps {
  byPriority: PriorityTotal[]
  displayCurrency: CurrencyId
  /**
   * Variante reducida, para la fila de una lista dentro del resumen: mismo contenido
   * que la grande (restante, de cuánto, progreso) con tipografías y espaciados menores.
   */
  compact?: boolean
  /** Clases de la grilla: quien la usa decide cuántas columnas caben en su ancho. */
  className?: string
  testId: string
}

/**
 * Las tarjetas de un desglose por prioridad: restante en grande, el total del que sale
 * debajo y una barra con lo ya comprado. Compartidas por el desglose global del resumen
 * y por cada fila de lista, para que la misma cifra no signifique cosas distintas.
 */
export function PriorityCards({
  byPriority,
  displayCurrency,
  compact = false,
  className,
  testId,
}: PriorityCardsProps) {
  return (
    <div className={cn('grid', compact ? 'gap-1.5' : 'gap-2', className)}>
      {byPriority.map((row) => (
        <div
          key={row.priority}
          data-testid={testId}
          data-covered={isCovered(row)}
          className={cn(
            'flex flex-col border border-border/60 bg-background/60 transition-opacity data-[covered=true]:opacity-50',
            compact ? 'gap-1 rounded-lg p-1.5' : 'gap-2 rounded-xl p-2.5'
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-[5px] font-bold leading-none text-white',
                compact ? 'size-4 text-[10px]' : 'size-5 text-[11px]'
              )}
              style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
            >
              {row.priority}
            </span>
            <span className={cn('truncate font-bold', compact ? 'text-[10px]' : 'text-xs')}>
              {PRIORITY_LABELS[row.priority]}
            </span>
          </div>

          <div className="min-w-0">
            <p
              className={cn(
                'truncate font-black tabular-nums',
                compact ? 'text-xs' : 'text-sm sm:text-base'
              )}
            >
              {row.remaining === null ? '—' : formatMoney(row.remaining, displayCurrency)}
            </p>
            {row.total !== null && (
              <p
                className={cn(
                  'truncate tabular-nums text-muted-foreground',
                  compact ? 'text-[10px]' : 'text-xs'
                )}
              >
                de {formatMoney(row.total, displayCurrency)}
              </p>
            )}
          </div>

          {row.total !== null && row.remaining !== null && (
            <div
              aria-hidden
              className={cn(
                'overflow-hidden rounded-full bg-muted',
                compact ? 'h-0.5' : 'h-1'
              )}
            >
              <div
                data-testid="priority-progress"
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${purchasedPercent(row)}%`,
                  backgroundColor: PRIORITY_COLORS[row.priority],
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function PriorityBreakdown({
  byPriority,
  displayCurrency,
  open,
  onOpenChange,
}: PriorityBreakdownProps) {
  if (byPriority.length <= 1) return null

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 py-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Por prioridad
        </span>
        <span className="flex items-center gap-1">
          {byPriority.map((row) => (
            <span
              key={row.priority}
              data-testid="priority-dot"
              data-covered={isCovered(row)}
              className="size-2.5 rounded-full transition-opacity data-[covered=true]:opacity-40"
              style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
            />
          ))}
        </span>
        <ChevronDownIcon
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsiblePanel>
        <PriorityCards
          byPriority={byPriority}
          displayCurrency={displayCurrency}
          testId="priority-card"
          className="grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] pb-3 pt-1"
        />

        <div className="h-px bg-border/60" />
      </CollapsiblePanel>
    </Collapsible>
  )
}
