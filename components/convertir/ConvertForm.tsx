'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRates } from '@/hooks/useRates'
import { RATES_METADATA } from '@/constants/rates'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  DollarIcon, 
  BinanceIcon, 
  RefreshIcon, 
  EuroIcon,
  CheckIcon,
  CopyIcon
} from '@/components/icons'
import { LastUpdateBadge } from '@/components/LastUpdateBadge'

const STORAGE_KEY = 'bolivar_convert_prefs'

type Currency = 'VES' | 'USD'

interface ConvertPrefs {
  amount: string
  currency: Currency
  customRate: string
}

export function ConvertForm() {
  const { rates, isStale, formatLastUpdate } = useRates()
  
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState<ConvertPrefs>({
    amount: '1',
    currency: 'VES',
    customRate: '0.00'
  })

  // Cargar preferencias en el cliente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const prefs: ConvertPrefs = JSON.parse(saved)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData(prefs)
      } catch (e) {
        console.error('Error loading prefs', e)
      }
    }
    setIsMounted(true)
  }, [])

  // Guardar preferencias
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData, isMounted])

  const results = useMemo(() => {
    const { amount, currency, customRate } = formData
    const numAmount = parseFloat(amount) || 0

    const getConverted = (rateStr: string | undefined, forceInverse = false) => {
      const rate = parseFloat(rateStr || '0')
      if (rate === 0) return '0.00'
      
      if (currency === 'VES' || forceInverse) {
        return (numAmount / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      } else {
        return (numAmount * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
    }

    return {
      bcvUsd: getConverted(rates.bcvUsd),
      bcvEur: getConverted(rates.bcvEur),
      binance: getConverted(rates.binanceUsdAvg),
      custom: getConverted(customRate)
    }
  }, [formData, rates])

  if (!isMounted) return null

  const handleAmountChange = (val: string) => setFormData(prev => ({ ...prev, amount: val }))
  const handleCurrencyChange = (val: Currency) => setFormData(prev => ({ ...prev, currency: val }))
  const handleCustomRateChange = (val: string) => setFormData(prev => ({ ...prev, customRate: val }))

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex flex-col items-center gap-3 text-center">
        <LastUpdateBadge 
          lastUpdate={rates.lastUpdate}
          isStale={isStale}
          formattedDate={formatLastUpdate(rates.lastUpdate)}
        />
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter">Calculadora Dinámica</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg">
          Ingresa un monto y obtén su valor convertido instantáneamente en todas las tasas del sistema.
        </p>
      </div>

      {/* Input Section */}
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-xl shadow-primary/5 py-0">
        <CardContent className="pt-2 pb-4 px-4 md:pt-3 md:pb-6 md:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Amount & Currency */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="amount-input" className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Monto a Convertir</label>
              <div className="relative group">
                <input
                  id="amount-input"
                  type="number"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-background border-2 border-border/50 rounded-xl h-16 px-5 pr-24 text-2xl font-bold transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 group-hover:border-border"
                  placeholder="0.00"
                />
                <div className="absolute right-2 top-2 bottom-2 flex p-1 bg-secondary/50 rounded-lg border border-border/50">
                  <button
                    onClick={() => handleCurrencyChange('VES')}
                    className={cn(
                      "px-3 rounded-md text-xs font-black transition-all",
                      formData.currency === 'VES' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    VES
                  </button>
                  <button
                    onClick={() => handleCurrencyChange('USD')}
                    className={cn(
                      "px-3 rounded-md text-xs font-black transition-all",
                      formData.currency === 'USD' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Rate */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-rate-input" className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Tasa Personalizada (Bs.)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <RefreshIcon className="size-5" />
                </div>
                <input
                  id="custom-rate-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.customRate}
                  onChange={(e) => handleCustomRateChange(e.target.value)}
                  className="w-full bg-background border-2 border-border/50 rounded-xl h-16 pl-12 px-5 text-2xl font-bold transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 group-hover:border-border"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Grid - Max 3 per row, centered flex layout */}
      <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
        {/* BCV USD */}
        <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-75">
          <ResultCard
            label={RATES_METADATA.bcvUsd.shortLabel}
            value={results.bcvUsd}
            currency={formData.currency === 'VES' ? 'USD' : 'Bs.'}
            icon={<DollarIcon className="size-5 text-green-600 dark:text-green-400" />}
            subLabel={`Tasa Oficial: ${rates.bcvUsd}Bs.`}
            colorClass="bg-green-50/50 dark:bg-green-500/10 border-green-200/60 dark:border-green-500/20"
            textColor="text-green-600 dark:text-green-400"
          />
        </div>

        {/* BCV EUR */}
        <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-75">
          <ResultCard
            label={RATES_METADATA.bcvEur.shortLabel}
            value={results.bcvEur}
            currency={formData.currency === 'VES' ? 'EUR' : 'Bs.'}
            icon={<EuroIcon className="size-5 text-blue-500 dark:text-blue-400" />}
            subLabel={`Tasa Oficial: ${rates.bcvEur}Bs.`}
            colorClass="bg-blue-50/50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20"
            textColor="text-blue-500 dark:text-blue-400"
          />
        </div>

        {/* Binance */}
        <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-75">
          <ResultCard
            label="Binance P2P"
            value={results.binance}
            currency={formData.currency === 'VES' ? 'USD' : 'Bs.'}
            icon={<BinanceIcon className="size-5 text-yellow-600 dark:text-yellow-500" />}
            subLabel={`Mercado P2P: ${rates.binanceUsdAvg}Bs.`}
            colorClass="bg-yellow-50/50 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-500/20"
            textColor="text-yellow-600 dark:text-yellow-500"
          />
        </div>

        {/* Custom */}
        <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-75">
          <ResultCard
            label="Personalizada"
            value={results.custom}
            currency={formData.currency === 'VES' ? 'USD' : 'Bs.'}
            icon={<RefreshIcon className="size-5 text-primary" />}
            subLabel={`Tu propia tasa: ${formData.customRate}Bs.`}
            colorClass="bg-primary/5 dark:bg-primary/10 border-primary/20"
            textColor="text-primary"
            highlight
          />
        </div>
      </div>
    </div>
  )
}

interface ResultCardProps {
  label: string
  value: string
  currency: string
  icon: React.ReactNode
  subLabel: string
  colorClass: string
  textColor: string
  highlight?: boolean
}

function ResultCard({ label, value, currency, icon, subLabel, colorClass, textColor, highlight }: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // Eliminar separadores de miles para copiar un número limpio si es necesario, 
    // pero usualmente el usuario quiere el texto tal cual. 
    // Copiamos el valor visible.
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Extraer el prefijo (ej: "Tasa Oficial") y el valor (ej: "582.69Bs.") del subLabel actual
  const [subLabelPrefix, subLabelValue] = subLabel.split(': ')

  return (
    <Card 
      onClick={handleCopy}
      className={cn(
        "border-2 transition-all hover:scale-[1.02] active:scale-[0.98] duration-300 shadow-sm hover:shadow-md w-full cursor-pointer relative group py-0",
        colorClass
      )}
    >
      <CardContent className="pt-3 pb-3 px-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="size-9 rounded-xl bg-background border border-border/50 flex items-center justify-center shadow-xs shrink-0">
            {icon}
          </div>
          
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">
              {subLabelPrefix}
            </span>
            <span className={cn(
              "text-[12px] font-black tracking-tight drop-shadow-xs",
              textColor
            )}>
              {subLabelValue}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col mt-1">
          <span className="text-[10px] font-bold text-muted-foreground/80">{label}</span>
          <div className="flex items-baseline gap-1.5 overflow-hidden">
            <span className={cn(
              "text-2xl font-black tracking-tighter truncate",
              highlight ? "text-primary" : "text-foreground"
            )}>
              {value}
            </span>
            <span className="text-xs font-black text-muted-foreground/50 shrink-0">{currency}</span>
          </div>
        </div>

        {/* Copy Indicator Icon - Slightly smaller, primary color on hover */}
        <div className="absolute bottom-4 right-4 transition-all">
          {copied ? (
            <div className={cn(
              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter animate-in fade-in zoom-in duration-300",
              textColor
            )}>
              <span>Copiado</span>
              <CheckIcon className="size-3.5" />
            </div>
          ) : (
            <div className="text-muted-foreground/30 group-hover:text-primary/70 transition-colors duration-300">
              <CopyIcon className="size-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
