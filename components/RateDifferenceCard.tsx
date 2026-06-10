'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUpIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

import { RATES_METADATA, RateId, Rates, RateInfo } from '@/constants/rates'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { ChevronRightIcon } from '@/components/icons'

type ExtendedRateId = RateId | 'custom'

interface RateDifferenceCardProps {
  rates: Rates
}

const STORAGE_KEY = 'bolivar_comparison_pref_v2'

const RateSelector = ({ 
  value, 
  onValueChange, 
  otherValue,
  allowCustom = false,
  customValue,
  setCustomValue
}: { 
  value: ExtendedRateId, 
  onValueChange: (v: ExtendedRateId) => void,
  otherValue: ExtendedRateId,
  allowCustom?: boolean
  customValue: string
  setCustomValue: (val: string) => void
}) => {
  const [open, setOpen] = useState(false)

  const handleSelect = (v: ExtendedRateId) => {
    onValueChange(v)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all group outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-32">
          {value === 'custom' ? `Personalizado` : RATES_METADATA[value as RateId].shortLabel}
        </span>
        <ChevronRightIcon className="size-3.5 text-muted-foreground group-hover:text-primary transition-all rotate-90 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handleSelect(v as ExtendedRateId)}>
          {(Object.values(RATES_METADATA) as RateInfo[])
            .filter(meta => meta.id !== otherValue)
            .map((meta) => (
              <DropdownMenuRadioItem key={meta.id} value={meta.id}>
                {meta.shortLabel}
              </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
        
        {allowCustom && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={cn(value === 'custom' && "bg-accent text-accent-foreground")}>
                <span>Personalizado</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent 
                className="p-3 min-w-52"
                onKeyDownCapture={(e) => {
                  if (e.target instanceof HTMLInputElement) {
                    if (e.key === 'Enter') {
                      handleSelect('custom');
                    }
                    e.stopPropagation();
                  }
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-tighter">Valor de Tasa (Bs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValue}
                      onKeyDown={(e) => {
                        if (e.key === ' ') e.stopPropagation();
                      }}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect('custom');
                    }}
                    className="w-full text-xs font-black bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
                  >
                    APLICAR TASA
                  </button>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RateDifferenceCard({ rates }: RateDifferenceCardProps) {
  const [state, setState] = useState<{
    rate1: ExtendedRateId
    rate2: ExtendedRateId
    customValue: string
  }>({
    rate1: 'bcvUsd',
    rate2: 'binanceUsdAvg',
    customValue: '0.00'
  })
  
  const [isMounted, setIsMounted] = useState(false)

  // Cargar preferencias
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const { rate1, rate2, customVal } = JSON.parse(saved)
        queueMicrotask(() => {
          setState(prev => ({
            rate1: (RATES_METADATA[rate1 as RateId] || rate1 === 'custom') ? (rate1 as ExtendedRateId) : prev.rate1,
            rate2: (RATES_METADATA[rate2 as RateId] || rate2 === 'custom') ? (rate2 as ExtendedRateId) : prev.rate2,
            customValue: customVal || prev.customValue
          }))
        })
      } catch (e) {
        console.error('Error loading comparison preferences:', e)
      }
    }
    queueMicrotask(() => {
      setIsMounted(true)
    })
  }, [])

  // Guardar preferencias
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        rate1: state.rate1, 
        rate2: state.rate2,
        customVal: state.customValue
      }))
    }
  }, [state, isMounted])

  const comparison = useMemo(() => {
    const getVal = (key: ExtendedRateId) => key === 'custom' ? parseFloat(state.customValue) : parseFloat(rates[key as RateId] || '0')
    const val1 = getVal(state.rate1)
    const val2 = getVal(state.rate2)

    if (isNaN(val1) || isNaN(val2) || val1 === 0 || val2 === 0) {
      return null
    }

    const diff = val2 - val1
    // Calculamos el porcentaje siempre respecto al valor menor (brecha)
    // Esto asegura que la magnitud del porcentaje sea la misma sin importar el orden
    const minVal = Math.min(val1, val2)
    const percent = (Math.abs(diff) / minVal) * 100
    
    const getLabel = (key: ExtendedRateId) => key === 'custom' ? `Personalizado (${parseFloat(state.customValue).toFixed(2)})` : RATES_METADATA[key as RateId].shortLabel

    return {
      diff,
      percent,
      label1: getLabel(state.rate1),
      label2: getLabel(state.rate2),
      isPositive: diff > 0,
      isNegative: diff < 0,
      isEqual: Math.abs(diff) < 0.001
    }
  }, [rates, state])

  if (!isMounted) return null

  const handleRate1Change = (newVal: ExtendedRateId) => {
    setState(prev => {
      let nextRate2 = prev.rate2
      if (newVal === prev.rate2 && newVal !== 'custom') {
        const nextAvailable = (Object.keys(RATES_METADATA) as ExtendedRateId[]).find(id => id !== newVal)
        if (nextAvailable) nextRate2 = nextAvailable
      }
      return { ...prev, rate1: newVal, rate2: nextRate2 }
    })
  }

  const handleRate2Change = (newVal: ExtendedRateId) => {
    setState(prev => {
      let nextRate1 = prev.rate1
      if (newVal === prev.rate1 && newVal !== 'custom') {
        const nextAvailable = (Object.keys(RATES_METADATA) as ExtendedRateId[]).find(id => id !== newVal)
        if (nextAvailable) nextRate1 = nextAvailable
      }
      return { ...prev, rate1: nextRate1, rate2: newVal }
    })
  }

  const setCustomValue = (val: string) => {
    setState(prev => ({ ...prev, customValue: val }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-linear-to-b from-card to-card/50 border-border/50 shadow-xs">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Comparativa</span>
              <div className="flex items-center gap-2">
                <RateSelector 
                  value={state.rate1} 
                  onValueChange={handleRate1Change} 
                  otherValue={state.rate2}
                  customValue={state.customValue}
                  setCustomValue={setCustomValue}
                />
                <span className="text-muted-foreground text-[10px] font-black uppercase opacity-40">vs</span>
                <RateSelector 
                  value={state.rate2} 
                  onValueChange={handleRate2Change} 
                  otherValue={state.rate1} 
                  allowCustom 
                  customValue={state.customValue}
                  setCustomValue={setCustomValue}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-secondary/30 rounded-2xl px-6 py-3 border border-border/40 w-full md:w-auto">
            {!comparison ? (
              <span className="text-muted-foreground animate-pulse font-medium">Calculando...</span>
            ) : (
              <div className="flex flex-col items-center md:items-end text-center md:text-right">
                <div className={cn(
                  "text-2xl font-black tracking-tight",
                  comparison.isPositive && "text-red-500",
                  comparison.isNegative && "text-green-600",
                  comparison.isEqual && "text-muted-foreground"
                )}>
                  {comparison.isEqual ? '0.00%' : `${comparison.isPositive ? '+' : ''}${comparison.percent.toFixed(2)}%`}
                </div>
                <div className="text-xs font-semibold text-muted-foreground/80 mt-0.5">
                  {comparison.isEqual ? (
                    'Tasas iguales'
                  ) : (
                    <>
                      {comparison.label2} es{' '}
                      <span className={cn(
                        "font-bold",
                        comparison.isPositive ? "text-red-500/90" : "text-green-600/90"
                      )}>
                        {comparison.isPositive ? 'superior' : 'inferior'}
                      </span>{' '}
                      por {Math.abs(comparison.diff).toFixed(2)} Bs.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
