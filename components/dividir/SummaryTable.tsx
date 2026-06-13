'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckIcon, CopyIcon } from '@/components/icons'

import { RateConversion } from '@/hooks/useBillSplitter'
import { Rates } from '@/constants/rates'
import { CurrencyId } from '@/constants/currencies'

/* ─── Formatting helpers ─── */
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function SummaryTable({
  breakdowns,
  symbol,
  rawTotal,
  tipValue,
  ivaValue,
  igtfValue,
  grandTotal,
  tipIncluded,
  ivaIncluded,
  igtfIncluded,
  uid,
  handleCopy,
  copied,
  currency,
  rates,
  buildConversions,
}: {
  breakdowns: { id: string; name: string; subtotal: number; tipShare: number; ivaShare: number; igtfShare: number; total: number }[]
  symbol: string
  rawTotal: number
  tipValue: number
  ivaValue: number
  igtfValue: number
  grandTotal: number
  tipIncluded: boolean
  ivaIncluded: boolean
  igtfIncluded: boolean
  uid: string
  handleCopy: () => void
  copied: boolean
  currency: CurrencyId
  rates: Rates
  buildConversions: (total: number, currency: CurrencyId, rates: Rates) => RateConversion[]
}) {
  const showIgtf = igtfIncluded && (currency === 'USD' || currency === 'EUR')

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Resumen por persona
        </h2>
      </div>

      <Card className="border-border/60 py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-black text-xs uppercase tracking-wider text-foreground pl-4">
                Persona
              </TableHead>
              <TableHead className="font-black text-xs uppercase tracking-wider text-foreground text-right">
                Consumo
              </TableHead>
              {!tipIncluded && tipValue > 0 && (
                <TableHead className="font-black text-xs uppercase tracking-wider text-foreground text-right">
                  Propina
                </TableHead>
              )}
              {!ivaIncluded && (
                <TableHead className="font-black text-xs uppercase tracking-wider text-foreground text-right">
                  IVA
                </TableHead>
              )}
              {showIgtf && (
                <TableHead className="font-black text-xs uppercase tracking-wider text-foreground text-right">
                  IGTF
                </TableHead>
              )}
              <TableHead className="font-black text-xs uppercase tracking-wider text-primary text-right pr-4">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {breakdowns.map((p) => {
              const pConversions = buildConversions(p.total, currency, rates)
              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-primary uppercase">
                          {p.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-semibold text-sm truncate max-w-20">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {symbol}{fmt(p.subtotal)}
                  </TableCell>
                  {!tipIncluded && tipValue > 0 && (
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {symbol}{fmt(p.tipShare)}
                    </TableCell>
                  )}
                  {!ivaIncluded && (
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {symbol}{fmt(p.ivaShare)}
                    </TableCell>
                  )}
                  {showIgtf && (
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {symbol}{fmt(p.igtfShare)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono font-black text-sm text-primary pr-4">
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{symbol}{fmt(p.total)}</span>
                      {pConversions.length > 0 && (
                        <div className="flex flex-col items-end">
                          {pConversions.map((c) => (
                            <span key={c.rateId} className="text-[10px] font-medium text-muted-foreground leading-tight">
                              {c.symbol}{fmt(c.value)} {c.shortLabel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell className="pl-4 font-black text-[10px] uppercase tracking-wider">
                Total
              </TableCell>
              <TableCell className="text-right font-mono font-bold text-sm">
                {symbol}{fmt(rawTotal)}
              </TableCell>
              {!tipIncluded && tipValue > 0 && (
                <TableCell className="text-right font-mono font-bold text-sm">
                  {symbol}{fmt(tipValue)}
                </TableCell>
              )}
              {!ivaIncluded && (
                <TableCell className="text-right font-mono font-bold text-sm">
                  {symbol}{fmt(ivaValue)}
                </TableCell>
              )}
              {showIgtf && (
                <TableCell className="text-right font-mono font-bold text-sm">
                  {symbol}{fmt(igtfValue)}
                </TableCell>
              )}
              <TableCell className="text-right font-mono font-black text-sm text-primary pr-4">
                {symbol}{fmt(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      <Button
        id={`${uid}-copy-itemized`}
        onClick={handleCopy}
        className="w-full h-12 gap-2 text-sm font-bold rounded-xl mt-2"
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
  )
}
