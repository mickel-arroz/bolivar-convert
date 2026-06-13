'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { Rates } from '@/constants/rates'
import { TAX_RATES, TipPercentage } from '@/constants/config'

/* ─── Types ─── */
export interface ConsumedItem {
  id: string
  title: string
  amount: string
}

export interface Person {
  id: string
  name: string
  items: ConsumedItem[]
}

export type SplitMode = 'equal' | 'itemized'
export type TipMode = 'percentage' | 'amount'

export interface BillSplitterState {
  splitMode: SplitMode
  equalSplitAmount: string
  equalSplitPeopleCount: string
  people: Person[]
  currency: CurrencyId
  ivaIncluded: boolean
  tipIncluded: boolean
  igtfIncluded: boolean
  tipMode: TipMode
  tipPercentage: TipPercentage
  customTipPercent: string
  tipAmount: string
}

export interface PersonBreakdown {
  id: string
  name: string
  subtotal: number
  tipShare: number
  ivaShare: number
  igtfShare: number
  total: number
}

export interface RateConversion {
  rateId: string
  label: string
  shortLabel: string
  colorClass: string
  textColor: string
  value: number
  symbol: string
}

/* ─── Storage ─── */
const STORAGE_KEY = 'bolivar_bill_splitter_v1'

const DEFAULT_STATE: BillSplitterState = {
  splitMode: 'itemized',
  equalSplitAmount: '',
  equalSplitPeopleCount: '',
  people: [],
  currency: 'VES',
  ivaIncluded: true,
  tipIncluded: true,
  igtfIncluded: false,
  tipMode: 'percentage',
  tipPercentage: 10,
  customTipPercent: '',
  tipAmount: '',
}

/* ─── Helpers ─── */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function parseAmount(value: string): number {
  const n = parseFloat(String(value).replace(',', '.'))
  return isNaN(n) || n < 0 ? 0 : n
}

/* ─── Hook ─── */
export function useBillSplitter() {
  const [isMounted, setIsMounted] = useState(false)
  const [state, setState] = useState<BillSplitterState>(DEFAULT_STATE)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: BillSplitterState = JSON.parse(raw)
        // Ensure igtfIncluded exists in parsed state for backwards compatibility
        if (parsed.igtfIncluded === undefined) parsed.igtfIncluded = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(parsed)
      }
    } catch {
      /* ignore parse errors */
    }
    setIsMounted(true)
  }, [])

  // Persist on every state change (after mount)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isMounted])

  /* ── Actions ── */
  const setSplitMode = useCallback((splitMode: SplitMode) =>
    setState((s) => ({ ...s, splitMode })), [])

  const setEqualSplitAmount = useCallback((equalSplitAmount: string) =>
    setState((s) => ({ ...s, equalSplitAmount })), [])

  const setEqualSplitPeopleCount = useCallback((equalSplitPeopleCount: string) =>
    setState((s) => ({ ...s, equalSplitPeopleCount })), [])

  const setCurrency = useCallback((currency: CurrencyId) =>
    setState((s) => ({ ...s, currency })), [])

  const setIvaIncluded = useCallback((ivaIncluded: boolean) =>
    setState((s) => ({ ...s, ivaIncluded })), [])

  const setTipIncluded = useCallback((tipIncluded: boolean) =>
    setState((s) => ({ ...s, tipIncluded })), [])

  const setIgtfIncluded = useCallback((igtfIncluded: boolean) =>
    setState((s) => ({ ...s, igtfIncluded })), [])

  const setTipMode = useCallback((tipMode: TipMode) =>
    setState((s) => ({ ...s, tipMode })), [])

  const setTipPercentage = useCallback((tipPercentage: TipPercentage) =>
    setState((s) => ({ ...s, tipPercentage })), [])

  const setCustomTipPercent = useCallback((customTipPercent: string) =>
    setState((s) => ({ ...s, customTipPercent })), [])

  const setTipAmount = useCallback((tipAmount: string) =>
    setState((s) => ({ ...s, tipAmount })), [])

  const addPerson = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((s) => ({
      ...s,
      people: [
        ...s.people,
        { id: generateId(), name: trimmed, items: [] }
      ]
    }))
  }, [])

  const removePerson = useCallback((personId: string) => {
    setState((s) => ({ ...s, people: s.people.filter((p) => p.id !== personId) }))
  }, [])

  const addItem = useCallback((personId: string, title: string, amount: string) => {
    if (!amount || parseAmount(amount) <= 0) return
    setState((s) => ({
      ...s,
      people: s.people.map((p) =>
        p.id !== personId
          ? p
          : {
              ...p,
              items: [
                ...p.items,
                { id: generateId(), title: title.trim(), amount }
              ]
            }
      )
    }))
  }, [])

  const removeItem = useCallback((personId: string, itemId: string) => {
    setState((s) => ({
      ...s,
      people: s.people.map((p) =>
        p.id !== personId ? p : { ...p, items: p.items.filter((it) => it.id !== itemId) }
      )
    }))
  }, [])

  const clearAll = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  const hasData = state.people.length > 0

  /* ── Derived calculations ── */
  const calculations = useMemo(() => {
    const { splitMode, equalSplitAmount, equalSplitPeopleCount, people, currency, ivaIncluded, tipIncluded, igtfIncluded, tipMode, tipPercentage, customTipPercent, tipAmount } = state

    const subtotals = people.map((p) => ({
      id: p.id,
      name: p.name,
      subtotal: p.items.reduce((sum, it) => sum + parseAmount(it.amount), 0)
    }))

    const rawTotal = splitMode === 'equal' 
      ? parseAmount(equalSplitAmount) 
      : subtotals.reduce((sum, p) => sum + p.subtotal, 0)

    // Tip on raw total
    let tipValue = 0
    if (!tipIncluded) {
      if (tipMode === 'percentage') {
        const pct = tipPercentage === 'custom'
          ? parseAmount(customTipPercent)
          : tipPercentage
        tipValue = rawTotal * (pct / 100)
      } else {
        tipValue = parseAmount(tipAmount)
      }
    }

    // IVA on raw total (base)
    const ivaValue = ivaIncluded ? 0 : rawTotal * TAX_RATES.IVA
    
    // IGTF on raw total (base)
    const igtfValue = (igtfIncluded && (currency === 'USD' || currency === 'EUR')) ? rawTotal * TAX_RATES.IGTF : 0
    
    const grandTotal = rawTotal + tipValue + ivaValue + igtfValue;

    // Per-person proportional breakdown
    let breakdowns: PersonBreakdown[] = []
    let perPersonTotal = 0

    if (splitMode === 'itemized') {
      const hasPeople = people.length > 0
      breakdowns = subtotals.map((p) => {
        const proportion = rawTotal > 0
          ? p.subtotal / rawTotal
          : hasPeople ? 1 / people.length : 0
        const personTip = tipValue * proportion
        const personIva = ivaValue * proportion
        const personIgtf = igtfValue * proportion
        const personTotal = p.subtotal + personTip + personIva + personIgtf
        return {
          id: p.id,
          name: p.name,
          subtotal: p.subtotal,
          tipShare: personTip,
          ivaShare: personIva,
          igtfShare: personIgtf,
          total: personTotal
        }
      })
    } else {
      const pCount = Math.max(1, parseInt(equalSplitPeopleCount) || 1)
      perPersonTotal = grandTotal / pCount
    }

    return { rawTotal, tipValue, ivaValue, igtfValue, grandTotal, breakdowns, perPersonTotal }
  }, [state])

  /* ── Rate conversions ── */
  const buildConversions = useCallback(
    (grandTotal: number, currency: CurrencyId, rates: Rates): RateConversion[] => {
      const result: RateConversion[] = []

      const rateNum = (r: string | undefined) => {
        const n = parseFloat(r ?? '0')
        return isNaN(n) ? 0 : n
      }

      if (currency === 'VES') {
        // Show equivalents in foreign currencies
        const bcvUsd = rateNum(rates.bcvUsd)
        if (bcvUsd > 0) result.push({
          rateId: 'bcvUsd', label: 'Dólar Oficial (BCV)', shortLabel: 'USD BCV',
          colorClass: 'bg-green-50/50 dark:bg-green-500/10 border-green-200/60 dark:border-green-500/20',
          textColor: 'text-green-600 dark:text-green-400',
          value: grandTotal / bcvUsd, symbol: '$'
        })

        const bcvEur = rateNum(rates.bcvEur)
        if (bcvEur > 0) result.push({
          rateId: 'bcvEur', label: 'Euro Oficial (BCV)', shortLabel: 'EUR BCV',
          colorClass: 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20',
          textColor: 'text-blue-500 dark:text-blue-400',
          value: grandTotal / bcvEur, symbol: '€'
        })

        const binance = rateNum(rates.binanceUsdAvg)
        if (binance > 0) result.push({
          rateId: 'binanceUsdAvg', label: 'Binance P2P', shortLabel: 'Binance',
          colorClass: 'bg-yellow-50/50 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-500/20',
          textColor: 'text-yellow-600 dark:text-yellow-500',
          value: grandTotal / binance, symbol: '$'
        })
      } else if (currency === 'USD') {
        // Show equivalents in Bs.
        const bcvUsd = rateNum(rates.bcvUsd)
        if (bcvUsd > 0) result.push({
          rateId: 'bcvUsd', label: 'Bolívares (BCV Oficial)', shortLabel: 'Bs. BCV',
          colorClass: 'bg-green-50/50 dark:bg-green-500/10 border-green-200/60 dark:border-green-500/20',
          textColor: 'text-green-600 dark:text-green-400',
          value: grandTotal * bcvUsd, symbol: 'Bs.'
        })

      } else if (currency === 'EUR') {
        // Show equivalents in Bs.
        const bcvEur = rateNum(rates.bcvEur)
        if (bcvEur > 0) result.push({
          rateId: 'bcvEur', label: 'Bolívares (BCV Oficial)', shortLabel: 'Bs. BCV',
          colorClass: 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20',
          textColor: 'text-blue-500 dark:text-blue-400',
          value: grandTotal * bcvEur, symbol: 'Bs.'
        })
      }

      return result
    },
    []
  )

  return {
    state,
    isMounted,
    hasData,
    calculations,
    buildConversions,
    // Actions
    setSplitMode,
    setEqualSplitAmount,
    setEqualSplitPeopleCount,
    setCurrency,
    setIvaIncluded,
    setTipIncluded,
    setIgtfIncluded,
    setTipMode,
    setTipPercentage,
    setCustomTipPercent,
    setTipAmount,
    addPerson,
    removePerson,
    addItem,
    removeItem,
    clearAll,
  }
}
