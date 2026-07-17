'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { clampDigits } from '@/lib/numberInput'
import { TIP_PERCENTAGES, TipPercentage } from '@/constants/config'

/* ─── Formatting helpers ─── */
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function TipConfigurator({
  uid,
  tipMode,
  setTipMode,
  tipPercentage,
  setTipPercentage,
  customTipPercent,
  setCustomTipPercent,
  rawTotal,
  symbol,
  tipAmount,
  setTipAmount,
  currency,
}: {
  uid: string
  tipMode: 'percentage' | 'amount'
  setTipMode: (mode: 'percentage' | 'amount') => void
  tipPercentage: TipPercentage
  setTipPercentage: (p: TipPercentage) => void
  customTipPercent: string
  setCustomTipPercent: (p: string) => void
  rawTotal: number
  symbol: string
  tipAmount: string
  setTipAmount: (a: string) => void
  currency: string
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden py-0">
      <CardContent className="px-5 py-5 flex flex-col gap-4">
        {/* ── Tip mode toggle ── */}
        <div className="flex p-1 bg-muted/40 rounded-xl border border-border/50">
          <button
            onClick={() => setTipMode('percentage')}
            className={cn(
              'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
              tipMode === 'percentage'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            Porcentaje (%)
          </button>
          <button
            onClick={() => setTipMode('amount')}
            className={cn(
              'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
              tipMode === 'amount'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            Monto Fijo
          </button>
        </div>

        {/* Percentage config */}
        {tipMode === 'percentage' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex gap-2">
              {TIP_PERCENTAGES.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTipPercentage(pct)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                    tipPercentage === pct
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-background text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {pct === 'custom' ? 'Otro' : `${pct}%`}
                </button>
              ))}
            </div>
            {tipPercentage === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  id={`${uid}-custom-tip`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="Propina %"
                  value={customTipPercent}
                  onChange={(e) =>
                    setCustomTipPercent(clampDigits(e.target.value, { maxIntegerDigits: 3, maxDecimals: 2 }))
                  }
                  className="w-32 h-10 border-2 border-border/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
            )}
            {tipPercentage !== 'custom' && rawTotal > 0 && (
              <p className="text-xs text-muted-foreground font-medium">
                Equivale a{' '}
                <span className="font-mono text-foreground font-bold">
                  {symbol}{fmt(rawTotal * (tipPercentage / 100))}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Amount input */}
        {tipMode === 'amount' && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <Input
              id={`${uid}-tip-amount`}
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto de propina"
              value={tipAmount}
              onChange={(e) => setTipAmount(clampDigits(e.target.value))}
              className="w-48 h-10 border-2 border-border/50 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <span className="text-sm font-bold text-muted-foreground">{currency}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
