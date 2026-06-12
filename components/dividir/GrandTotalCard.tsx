'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckIcon, CopyIcon, DollarIcon, EuroIcon, BinanceIcon } from '@/components/icons'
import { InlineCopy } from '@/components/dividir/InlineCopy'
import { cn } from '@/lib/utils'
import type { RateConversion, SplitMode } from '@/hooks/useBillSplitter'

/* ─── Formatting helpers ─── */
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function GrandTotalCard({
  splitMode,
  perPersonTotal,
  equalSplitPeopleCount,
  symbol,
  currency,
  tipIncluded,
  ivaIncluded,
  tipValue,
  ivaValue,
  rawTotal,
  grandTotal,
  conversions,
  handleCopy,
  copied,
  uid,
}: {
  splitMode: SplitMode
  perPersonTotal: number | undefined
  equalSplitPeopleCount: string
  symbol: string
  currency: string
  tipIncluded: boolean
  ivaIncluded: boolean
  tipValue: number
  ivaValue: number
  rawTotal: number
  grandTotal: number
  conversions: RateConversion[]
  handleCopy: () => void
  copied: boolean
  uid: string
}) {
  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm shadow-xl dark:shadow-2xl py-0 animate-in fade-in duration-300">
      <CardContent className="px-5 py-6 flex flex-col gap-4">
        {/* Breakdown lines */}
        {(!tipIncluded && tipValue > 0) || !ivaIncluded ? (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{symbol}{fmt(rawTotal)}</span>
            </div>
            {!tipIncluded && tipValue > 0 && (
              <div className="flex items-center justify-between">
                <span>Propina</span>
                <span className="font-mono">+ {symbol}{fmt(tipValue)}</span>
              </div>
            )}
            {!ivaIncluded && (
              <div className="flex items-center justify-between">
                <span>IVA (16%)</span>
                <span className="font-mono">+ {symbol}{fmt(ivaValue)}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Gran Total and Per Person Info */}
        {splitMode === 'equal' && perPersonTotal! > 0 && (
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-5 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                A cada uno le toca
              </span>
              <span className="text-xs font-semibold text-primary/60">
                Dividido entre {Math.max(1, parseInt(equalSplitPeopleCount) || 1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black tracking-tighter text-primary tabular-nums">
                  {symbol}{fmt(perPersonTotal!)}
                </span>
                <span className="text-sm font-black text-primary/80">{currency}</span>
              </div>
              <InlineCopy textToCopy={fmt(perPersonTotal!)} className="text-primary hover:bg-primary/20" />
            </div>
          </div>
        )}

        {/* Grand total amount */}
        <div className={cn("flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 sm:gap-0", splitMode === 'itemized' && "pt-3 border-t border-primary/20")}>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Gran Total
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tighter text-primary tabular-nums">
                {symbol}{fmt(grandTotal)}
              </span>
              <span className="text-sm font-black text-muted-foreground/60">{currency}</span>
            </div>
            <InlineCopy textToCopy={fmt(grandTotal)} className="text-primary hover:bg-primary/10" />
          </div>
        </div>

        {/* Rate conversions */}
        {conversions.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Equivalencias
            </p>
            <div className="flex flex-col gap-3">
              {conversions.map((conv) => (
                <div
                  key={conv.rateId}
                  className={cn(
                    'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-4 py-3 rounded-2xl border backdrop-blur-sm shadow-sm transition-transform hover:scale-[1.01]',
                    conv.colorClass
                  )}
                >
                  <div className="flex items-center gap-3">
                    {conv.rateId === 'bcvUsd' && <DollarIcon className={cn("size-5", conv.textColor)} />}
                    {conv.rateId === 'bcvEur' && <EuroIcon className={cn("size-5", conv.textColor)} />}
                    {conv.rateId === 'binanceUsdAvg' && <BinanceIcon className={cn("size-5", conv.textColor)} />}
                    <span className={cn('text-sm font-bold', conv.textColor)}>
                      {conv.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={cn('text-lg font-black font-mono tabular-nums', conv.textColor)}>
                      {conv.symbol}{fmt(conv.value)}
                    </span>
                    <InlineCopy textToCopy={fmt(conv.value)} className={conv.textColor} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {splitMode === 'equal' && (
          <div className="pt-2">
            <Button
              id={`${uid}-copy-equal`}
              onClick={handleCopy}
              className="w-full h-12 gap-2 text-sm font-bold rounded-xl"
              variant={copied ? "outline" : "secondary"}
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Resumen copiado</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" />
                  Copiar resumen completo
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
