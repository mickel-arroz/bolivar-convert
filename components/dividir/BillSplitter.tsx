'use client'

import { useState, useId } from 'react'
import { useBillSplitter } from '@/hooks/useBillSplitter'
import { useRates } from '@/hooks/useRates'
import { CURRENCIES, getCurrency } from '@/constants/currencies'
import { TAX_RATES } from '@/constants/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clampDigits, clampInteger } from '@/lib/numberInput'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { TrashIcon } from '@/components/icons'
import { parseAmount } from '@/hooks/useBillSplitter'

import { ToggleRow } from '@/components/dividir/ToggleRow'
import { PersonCard } from '@/components/dividir/PersonCard'
import { GrandTotalCard } from '@/components/dividir/GrandTotalCard'
import { SummaryTable } from '@/components/dividir/SummaryTable'
import { TipConfigurator } from '@/components/dividir/TipConfigurator'

/* ─── Formatting helpers ─── */
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/* ─── Main Component ─── */
export function BillSplitter() {
  const uid = useId()
  const { rates } = useRates()

  const {
    state,
    isMounted,
    hasData,
    calculations,
    buildConversions,
    setCurrency,
    setIvaIncluded,
    setTipIncluded,
    setTipPercentage,
    setCustomTipPercent,
    setTipAmount,
    addPerson,
    removePerson,
    addItem,
    removeItem,
    clearAll,
    setSplitMode,
    setEqualSplitAmount,
    setEqualSplitPeopleCount,
    setTipMode,
    setIgtfIncluded,
  } = useBillSplitter()

  const [newPersonName, setNewPersonName] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isMounted) return null

  const { splitMode, equalSplitAmount, equalSplitPeopleCount, people, currency, ivaIncluded, tipIncluded, igtfIncluded, tipMode, tipPercentage, customTipPercent, tipAmount } = state
  const { rawTotal, tipValue, ivaValue, igtfValue, grandTotal, breakdowns, perPersonTotal } = calculations
  const currencyMeta = getCurrency(currency)
  const symbol = currencyMeta.symbol

  const showSummary = splitMode === 'equal' 
    ? (parseAmount(equalSplitAmount) > 0 && Math.max(1, parseInt(equalSplitPeopleCount) || 1) > 0)
    : (people.length > 0 && rawTotal > 0)

  // Conversions
  const conversions = showSummary ? buildConversions(grandTotal, currency, rates) : []

  /* ── Add person ── */
  const handleAddPerson = () => {
    if (!newPersonName.trim()) return
    addPerson(newPersonName)
    setNewPersonName('')
  }

  const handlePersonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddPerson() }
  }

  /* ── Copy summary ── */
  const buildCopyText = () => {
    const lines: string[] = []
    const showTip = !tipIncluded && tipValue > 0
    const showIva = !ivaIncluded
    const showIgtf = igtfIncluded && (currency === 'USD' || currency === 'EUR')

    const now = new Date()
    const dateStr = now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

    lines.push('============================')
    lines.push('      DIVIDIR FACTURA')
    lines.push('============================')
    lines.push(`Moneda : ${currencyMeta.label} (${symbol})`)
    lines.push(`Fecha  : ${dateStr}`)
    lines.push('')

    // Per-person receipt blocks
    if (splitMode === 'itemized') {
      breakdowns.forEach((breakdown, i) => {
        if (i > 0) lines.push('')
        lines.push(`👤 ${breakdown.name.toUpperCase()}`)
        lines.push('----------------------------')

        const person = people.find((p) => p.id === breakdown.id)
        if (person && person.items.length > 0) {
          person.items.forEach((item) => {
            const label = item.title.trim() || 'Producto sin nombre'
            const amount = `${symbol}${fmt(parseAmount(item.amount))}`
            const totalWidth = 28
            const labelSlice = label.slice(0, totalWidth - amount.length - 1)
            const dots = '.'.repeat(Math.max(1, totalWidth - labelSlice.length - amount.length))
            lines.push(`  ${labelSlice}${dots}${amount}`)
          })
        } else {
          lines.push('  (sin ítems)')
        }

        lines.push('')
        lines.push(`  Subtotal             ${symbol}${fmt(breakdown.subtotal)}`)
        if (showTip && breakdown.tipShare > 0) {
          lines.push(`  Propina              +${symbol}${fmt(breakdown.tipShare)}`)
        }
        if (showIva && breakdown.ivaShare > 0) {
          lines.push(`  IVA (${TAX_RATES.IVA * 100}%)            +${symbol}${fmt(breakdown.ivaShare)}`)
        }
        if (showIgtf && breakdown.igtfShare > 0) {
          lines.push(`  IGTF (${TAX_RATES.IGTF * 100}%)            +${symbol}${fmt(breakdown.igtfShare)}`)
        }
        lines.push(`  ─────────────────────────`)
        lines.push(`  Total a pagar        ${symbol}${fmt(breakdown.total)}`)

        const pConversions = buildConversions(breakdown.total, currency, rates)
        if (pConversions.length > 0) {
          pConversions.forEach((c) => {
            lines.push(`    ${c.shortLabel.padEnd(14)} : ${c.symbol}${fmt(c.value)}`)
          })
        }
      })
    } else {
      const pCount = Math.max(1, parseInt(equalSplitPeopleCount) || 1)
      lines.push(`Dividido entre: ${pCount} personas`)
      lines.push(`Monto base    : ${symbol}${fmt(parseAmount(equalSplitAmount))}`)
      lines.push('')
    }

    // Global totals
    lines.push('')
    lines.push('============================')
    if (showTip) lines.push(`Propina total  : ${symbol}${fmt(tipValue)}`)
    if (showIva)  lines.push(`IVA total      : ${symbol}${fmt(ivaValue)}`)
    if (showIgtf) lines.push(`IGTF total     : ${symbol}${fmt(igtfValue)}`)
    lines.push(`GRAN TOTAL     : ${symbol}${fmt(grandTotal)}`)

    if (splitMode === 'equal') {
      lines.push('----------------------------')
      lines.push(`CADA UNO PAGA  : ${symbol}${fmt(perPersonTotal!)}`)

      const eqConversions = buildConversions(perPersonTotal!, currency, rates)
      if (eqConversions.length > 0) {
        eqConversions.forEach((c) => {
          lines.push(`  ${c.shortLabel.padEnd(14)} : ${c.symbol}${fmt(c.value)}`)
        })
      }
    }

    if (conversions.length > 0) {
      lines.push('')
      lines.push('Equivalencias:')
      conversions.forEach((c) => {
        lines.push(`  ${c.shortLabel.padEnd(14)}: ${c.symbol}${fmt(c.value)}`)
      })
    }

    lines.push('============================')

    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Top bar: clear button ── */}
      {hasData && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  id={`${uid}-clear`}
                  className="inline-flex items-center gap-2 h-8 px-3 text-xs font-bold rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                />
              }
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Limpiar todo
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Limpiar toda la cuenta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todas las personas e ítems. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>Limpiar todo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* ── Currency selector ── */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl dark:shadow-2xl py-0">
        <CardContent className="px-5 py-6">
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/80 mb-4 text-center">
            Moneda de la cuenta
          </p>
          <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl border border-border/50">
            {CURRENCIES.map((c) => (
              <button
                key={c.id}
                id={`${uid}-currency-${c.id}`}
                onClick={() => setCurrency(c.id)}
                className={cn(
                  'flex-1 py-3 px-3 rounded-xl text-sm font-black transition-all flex flex-col items-center justify-center',
                  currency === c.id
                    ? 'bg-background shadow-sm border border-border/50 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
                )}
              >
                <span className="block text-xl leading-none mb-1">{c.symbol}</span>
                <span className="text-xs leading-tight font-bold opacity-80">{c.id}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Split Mode selector ── */}
      <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl border border-border/50">
        {(['itemized', 'equal'] as const).map((mode) => (
          <button
            key={mode}
            id={`${uid}-mode-${mode}`}
            onClick={() => setSplitMode(mode)}
            className={cn(
              'flex-1 py-3 px-3 rounded-xl text-sm font-bold transition-all',
              splitMode === mode
                ? 'bg-background shadow-sm border border-border/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
            )}
          >
            {mode === 'itemized' ? 'Montos distintos' : 'Partes iguales'}
          </button>
        ))}
      </div>

      {splitMode === 'itemized' && (
        <>
          {/* ── Add person ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id={`${uid}-new-person`}
              placeholder="Nombre de la persona…"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={handlePersonKeyDown}
              className="w-full sm:flex-1 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <div className="flex justify-end w-full sm:w-auto">
              <Button
                id={`${uid}-add-person`}
                onClick={handleAddPerson}
                disabled={!newPersonName.trim()}
                className="h-14 px-6 font-bold rounded-2xl shadow-md text-base shrink-0"
              >
                + Agregar
              </Button>
            </div>
          </div>

          {people.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center">
              Comienza agregando las personas que participarán en la cuenta
            </p>
          )}

          {/* ── People cards ── */}
          {people.length > 0 && (
            <div className="flex flex-col gap-4">
              {people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  symbol={symbol}
                  onRemovePerson={removePerson}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {splitMode === 'equal' && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md py-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardContent className="px-5 py-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor={`${uid}-equal-amount`} className="text-sm font-bold">
                Monto total de la cuenta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-muted-foreground font-bold">{symbol}</span>
                </div>
                <Input
                  id={`${uid}-equal-amount`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={equalSplitAmount}
                  onChange={(e) => setEqualSplitAmount(clampDigits(e.target.value))}
                  className="pl-10 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`${uid}-equal-people`} className="text-sm font-bold">
                Número de personas
              </label>
              <Input
                id={`${uid}-equal-people`}
                type="number"
                min="1"
                step="1"
                placeholder="Ej: 4"
                value={equalSplitPeopleCount}
                onChange={(e) => setEqualSplitPeopleCount(clampInteger(e.target.value, 4))}
                className="h-14 text-lg bg-background border-2 border-border/50 rounded-2xl transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Toggles & tip config ── */}
      {(splitMode === 'equal' || people.length > 0) && (
        <div className="flex flex-col gap-3">
          <ToggleRow
            id={`${uid}-iva`}
            checked={ivaIncluded}
            onChange={setIvaIncluded}
            label="Los precios ya incluyen IVA"
            description={`Si se desactiva, se sumará el ${TAX_RATES.IVA * 100}% al total`}
          />

          {(currency === 'USD' || currency === 'EUR') && (
            <ToggleRow
              id={`${uid}-igtf`}
              checked={igtfIncluded}
              onChange={setIgtfIncluded}
              label={`Cobrar IGTF (${TAX_RATES.IGTF * 100}%)`}
              description={`Si se activa, se sumará el ${TAX_RATES.IGTF * 100}% de IGTF al monto base`}
            />
          )}

          <ToggleRow
            id={`${uid}-tip`}
            checked={tipIncluded}
            onChange={setTipIncluded}
            label="Los precios ya incluyen propina"
            description="Si se desactiva, se podrá agregar un extra"
          />

          {!tipIncluded && (
            <TipConfigurator
              uid={uid}
              tipMode={tipMode}
              setTipMode={setTipMode}
              tipPercentage={tipPercentage}
              setTipPercentage={setTipPercentage}
              customTipPercent={customTipPercent}
              setCustomTipPercent={setCustomTipPercent}
              rawTotal={rawTotal}
              symbol={symbol}
              tipAmount={tipAmount}
              setTipAmount={setTipAmount}
              currency={currency}
            />
          )}
        </div>
      )}

      {/* ── Grand Total ── */}
      {showSummary && (
        <GrandTotalCard
          splitMode={splitMode}
          perPersonTotal={perPersonTotal}
          equalSplitPeopleCount={equalSplitPeopleCount}
          symbol={symbol}
          currency={currency}
          tipIncluded={tipIncluded}
          ivaIncluded={ivaIncluded}
          igtfIncluded={igtfIncluded}
          tipValue={tipValue}
          ivaValue={ivaValue}
          igtfValue={igtfValue}
          rawTotal={rawTotal}
          grandTotal={grandTotal}
          conversions={conversions}
          handleCopy={handleCopy}
          copied={copied}
          uid={uid}
        />
      )}

      {/* ── Summary Table ── */}
      {showSummary && splitMode === 'itemized' && (
        <SummaryTable
          breakdowns={breakdowns}
          symbol={symbol}
          rawTotal={rawTotal}
          tipValue={tipValue}
          ivaValue={ivaValue}
          igtfValue={igtfValue}
          grandTotal={grandTotal}
          tipIncluded={tipIncluded}
          ivaIncluded={ivaIncluded}
          igtfIncluded={igtfIncluded}
          uid={uid}
          handleCopy={handleCopy}
          copied={copied}
          currency={currency}
          rates={rates}
          buildConversions={buildConversions}
        />
      )}
    </div>
  )
}
