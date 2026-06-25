'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { Rates, RateId } from '@/constants/rates'
import { generateId, parseAmount } from '@/hooks/useBillSplitter'
import { DEFAULT_CATEGORIES } from '@/constants/walletCategories'

/* ─── Tipos ─── */
export type TransactionType = 'income' | 'expense'

export interface Account {
  id: string
  name: string
  currency: CurrencyId
  openingBalance: string
  /** Clave de icono (ver ACCOUNT_ICON_MAP). Reutilizable entre cuentas. */
  icon: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  kind: TransactionType
  icon: string
  color?: string
  isDefault?: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  accountId: string
  categoryId: string
  amount: string
  note?: string
  date: string
  createdAt: string
}

/** Fuente de tasa de un traspaso entre monedas distintas. */
export type TransferRateSource = RateId | 'custom'

export interface Transfer {
  id: string
  fromAccountId: string
  toAccountId: string
  /** Monto que sale de la cuenta origen (en su moneda). */
  fromAmount: string
  /** Monto que llega a la cuenta destino (en su moneda). */
  toAmount: string
  /** Sólo presente cuando origen y destino tienen monedas distintas. */
  rate?: { source: TransferRateSource; value: string }
  note?: string
  date: string
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  /** Mes al que aplica, formato 'YYYY-MM'. */
  month: string
  /** Estimado del mes (editable, independiente del extra). */
  limit: string
  currency: CurrencyId
  /** Sobrante/déficit arrastrado de meses anteriores (con signo). Independiente de `limit`. */
  carryover?: string
}

export type TimeRange = '1m' | '6m' | '1y' | 'all'

export interface WalletState {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
  categories: Category[]
  budgets: Budget[]
  /** Meses 'YYYY-MM' cuyo presupuesto ya fue concluido (no se vuelve a avisar). */
  concludedMonths: string[]
  /** Moneda en la que se normalizan las estadísticas agregadas. */
  displayCurrency: CurrencyId
  /** Tasa USD usada para normalizar estadísticas (bcvUsd o binanceUsdAvg). */
  statsRateSource: RateId
  timeRange: TimeRange
}

/* ─── Tipos derivados ─── */
export interface AccountBalance {
  accountId: string
  currency: CurrencyId
  balance: number
}

export interface CategorySummaryRow {
  categoryId: string
  name: string
  icon: string
  color?: string
  kind: TransactionType
  total: number
}

export interface MonthlyPoint {
  month: string
  label: string
  income: number
  expense: number
}

export interface BudgetStatusRow {
  budget: Budget
  categoryName: string
  categoryIcon: string
  actual: number
  /** Estimado del mes. */
  limit: number
  /** Extra arrastrado (con signo). */
  carryover: number
  /** Disponible real = limit + carryover. */
  effectiveLimit: number
  ratio: number
  isOver: boolean
}

export interface StatsBundle {
  incomeVsExpense: { income: number; expense: number }
  categorySummary: CategorySummaryRow[]
  monthlySeries: MonthlyPoint[]
  netWorth: number
  budgetStatus: BudgetStatusRow[]
  /** false si falta alguna tasa necesaria para normalizar (ej. '---'). */
  ratesAvailable: boolean
}

/* ─── Almacenamiento ─── */
const STORAGE_KEY = 'bolivar_wallet_v1'

const DEFAULT_STATE: WalletState = {
  accounts: [],
  transactions: [],
  transfers: [],
  categories: DEFAULT_CATEGORIES,
  budgets: [],
  concludedMonths: [],
  displayCurrency: 'VES',
  statsRateSource: 'bcvUsd',
  timeRange: '1m',
}

/**
 * Combina las categorías guardadas con las por defecto: refresca la definición
 * (nombre/ícono/color) de las categorías por defecto desde el código, conserva las
 * creadas por el usuario y anexa cualquier categoría por defecto nueva.
 */
function mergeCategories(stored: Category[] | undefined): Category[] {
  if (!stored || stored.length === 0) return DEFAULT_CATEGORIES
  const defaultsById = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]))
  const merged = stored.map((c) => {
    const def = defaultsById.get(c.id)
    return def ? { ...c, ...def } : c
  })
  for (const def of DEFAULT_CATEGORIES) {
    if (!merged.some((c) => c.id === def.id)) merged.push(def)
  }
  return merged
}

/* ─── Helpers de fecha ─── */
/**
 * Clave de mes 'YYYY-MM'. Para cadenas tipo 'YYYY-MM-DD' (inputs date) se cortan
 * los componentes directamente para evitar desfase de zona horaria; para objetos
 * Date se usa la hora local.
 */
export function monthKey(isoDate: string | Date): string {
  if (typeof isoDate === 'string') {
    const m = isoDate.match(/^(\d{4})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}`
    isoDate = new Date(isoDate)
  }
  return `${isoDate.getFullYear()}-${String(isoDate.getMonth() + 1).padStart(2, '0')}`
}

/** Etiqueta legible de un mes 'YYYY-MM' (ej. 'jun 2026'). */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return d.toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })
}

function rangeStart(range: TimeRange, now = new Date()): Date {
  const d = new Date(now)
  switch (range) {
    case '1m':
      d.setMonth(d.getMonth() - 1)
      return d
    case '6m':
      d.setMonth(d.getMonth() - 6)
      return d
    case '1y':
      d.setFullYear(d.getFullYear() - 1)
      return d
    case 'all':
    default:
      return new Date(0)
  }
}

function filterByRange(transactions: Transaction[], range: TimeRange): Transaction[] {
  if (range === 'all') return transactions
  const start = rangeStart(range)
  return transactions.filter((tx) => new Date(tx.date) >= start)
}

/** Parsea un número permitiendo negativos (para el carryover, que puede ser deuda). */
function parseSigned(value: string | undefined): number {
  const n = parseFloat(String(value ?? '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/* ─── Helpers de conversión ─── */
function rateNum(r: string | undefined): number {
  const n = parseFloat(r ?? '0')
  return isNaN(n) ? 0 : n
}

/** Precio en Bs. de 1 unidad de la moneda dada (VES = 1). */
function bsPerUnit(currency: CurrencyId, rates: Rates, statsRateSource: RateId): number {
  if (currency === 'VES') return 1
  if (currency === 'EUR') return rateNum(rates.bcvEur)
  // USD: usa la fuente de tasa elegida (bcvUsd o binanceUsdAvg)
  return rateNum(rates[statsRateSource])
}

/** Normaliza un monto de `fromCur` a `toCur` pivotando por VES. 0 si falta tasa. */
function normalize(
  amount: number,
  fromCur: CurrencyId,
  toCur: CurrencyId,
  rates: Rates,
  statsRateSource: RateId
): number {
  if (fromCur === toCur) return amount
  const rFrom = bsPerUnit(fromCur, rates, statsRateSource)
  const rTo = bsPerUnit(toCur, rates, statsRateSource)
  if (rFrom <= 0 || rTo <= 0) return 0
  return (amount * rFrom) / rTo
}

/**
 * Convierte el monto de un traspaso entre cuentas.
 * - Misma moneda: idéntico.
 * - Con VES: `rateValue` = Bs. por unidad extranjera (VES→ext: /rate, ext→VES: *rate).
 * - Extranjera↔extranjera: `rateValue` = unidades destino por 1 unidad origen.
 */
export function convertTransferAmount(
  amount: number,
  fromCur: CurrencyId,
  toCur: CurrencyId,
  rateValue: number
): number {
  if (fromCur === toCur) return amount
  if (rateValue <= 0) return 0
  if (fromCur === 'VES') return amount / rateValue
  if (toCur === 'VES') return amount * rateValue
  return amount * rateValue
}

/* ─── Hook ─── */
/** Tipo del valor devuelto por useWallet, útil para tipar props de componentes hijos. */
export type WalletApi = ReturnType<typeof useWallet>

export function useWallet() {
  const [isMounted, setIsMounted] = useState(false)
  const [state, setState] = useState<WalletState>(DEFAULT_STATE)

  // Hidratar desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WalletState>
        const merged: WalletState = {
          ...DEFAULT_STATE,
          ...parsed,
          // Backfill: cuentas guardadas antes de tener icono → 'wallet'
          accounts: (parsed.accounts ?? []).map((a) => ({ ...a, icon: a.icon ?? 'wallet' })),
          transactions: parsed.transactions ?? [],
          transfers: parsed.transfers ?? [],
          // Refresca las categorías por defecto (por id) desde el código y conserva
          // las del usuario; si no hay ninguna guardada, siembra las por defecto.
          categories: mergeCategories(parsed.categories),
          budgets: parsed.budgets ?? [],
          concludedMonths: parsed.concludedMonths ?? [],
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(merged)
      }
    } catch {
      /* ignore parse errors */
    }
    setIsMounted(true)
  }, [])

  // Persistir en cada cambio (después del montaje)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isMounted])

  /* ── Cuentas ── */
  const addAccount = useCallback(
    (name: string, currency: CurrencyId, openingBalance: string, icon = 'wallet') => {
      const trimmed = name.trim()
      if (!trimmed) return
      setState((s) => ({
        ...s,
        accounts: [
          ...s.accounts,
          {
            id: generateId(),
            name: trimmed,
            currency,
            openingBalance: openingBalance || '0',
            icon,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
    },
    []
  )

  const updateAccount = useCallback(
    (id: string, patch: Partial<Pick<Account, 'name' | 'currency' | 'openingBalance' | 'icon'>>) => {
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }))
    },
    []
  )

  /** Elimina la cuenta y, en cascada, sus transacciones y traspasos asociados. */
  const removeAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
      transactions: s.transactions.filter((t) => t.accountId !== id),
      transfers: s.transfers.filter((t) => t.fromAccountId !== id && t.toAccountId !== id),
    }))
  }, [])

  /* ── Transacciones ── */
  const addTransaction = useCallback(
    (tx: { type: TransactionType; accountId: string; categoryId: string; amount: string; note?: string; date: string }) => {
      if (parseAmount(tx.amount) <= 0 || !tx.accountId || !tx.categoryId) return
      setState((s) => ({
        ...s,
        transactions: [
          ...s.transactions,
          {
            id: generateId(),
            type: tx.type,
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            amount: tx.amount,
            note: tx.note?.trim() || undefined,
            date: tx.date,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
    },
    []
  )

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Pick<Transaction, 'type' | 'accountId' | 'categoryId' | 'amount' | 'note' | 'date'>>) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
    },
    []
  )

  const removeTransaction = useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }))
  }, [])

  /* ── Traspasos ── */
  const addTransfer = useCallback(
    (params: {
      fromAccountId: string
      toAccountId: string
      fromAmount: string
      rateSource: TransferRateSource
      rateValue: number
      note?: string
      date: string
    }) => {
      const { fromAccountId, toAccountId, fromAmount, rateSource, rateValue, note, date } = params
      if (fromAccountId === toAccountId) return
      const amount = parseAmount(fromAmount)
      if (amount <= 0) return
      setState((s) => {
        const from = s.accounts.find((a) => a.id === fromAccountId)
        const to = s.accounts.find((a) => a.id === toAccountId)
        if (!from || !to) return s
        const sameCurrency = from.currency === to.currency
        const toAmount = sameCurrency
          ? amount
          : convertTransferAmount(amount, from.currency, to.currency, rateValue)
        if (!sameCurrency && toAmount <= 0) return s
        const transfer: Transfer = {
          id: generateId(),
          fromAccountId,
          toAccountId,
          fromAmount,
          toAmount: String(toAmount),
          rate: sameCurrency ? undefined : { source: rateSource, value: String(rateValue) },
          note: note?.trim() || undefined,
          date,
          createdAt: new Date().toISOString(),
        }
        return { ...s, transfers: [...s.transfers, transfer] }
      })
    },
    []
  )

  const removeTransfer = useCallback((id: string) => {
    setState((s) => ({ ...s, transfers: s.transfers.filter((t) => t.id !== id) }))
  }, [])

  /* ── Categorías ── */
  const addCategory = useCallback(
    (name: string, kind: TransactionType, icon: string, color?: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setState((s) => ({
        ...s,
        categories: [...s.categories, { id: generateId(), name: trimmed, kind, icon, color }],
      }))
    },
    []
  )

  const updateCategory = useCallback(
    (id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) => {
      setState((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    []
  )

  /** Elimina una categoría sólo si no es por defecto ni está en uso. */
  const removeCategory = useCallback((id: string) => {
    setState((s) => {
      const cat = s.categories.find((c) => c.id === id)
      if (!cat || cat.isDefault) return s
      const inUse =
        s.transactions.some((t) => t.categoryId === id) || s.budgets.some((b) => b.categoryId === id)
      if (inUse) return s
      return { ...s, categories: s.categories.filter((c) => c.id !== id) }
    })
  }, [])

  /* ── Presupuestos (upsert por categoría + mes) ── */
  const setBudget = useCallback(
    (categoryId: string, month: string, limit: string, currency: CurrencyId) => {
      setState((s) => {
        const existing = s.budgets.find((b) => b.categoryId === categoryId && b.month === month)
        if (existing) {
          return {
            ...s,
            budgets: s.budgets.map((b) =>
              b.id === existing.id ? { ...b, limit, currency } : b
            ),
          }
        }
        return {
          ...s,
          budgets: [...s.budgets, { id: generateId(), categoryId, month, limit, currency }],
        }
      })
    },
    []
  )

  const removeBudget = useCallback((id: string) => {
    setState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) }))
  }, [])

  /**
   * Concluye el presupuesto de `fromMonth` y arrastra el sobrante (con signo) a `toMonth`:
   * copia estimado y moneda al mes destino (sumando el carryover si ya existía), conserva el
   * mes origen como historial y lo marca como concluido. Los sobrantes se calculan en la UI
   * (que tiene las tasas) y se pasan por categoría.
   */
  const concludeBudgetMonth = useCallback(
    (fromMonth: string, toMonth: string, carryovers: Record<string, number>) => {
      setState((s) => {
        const fromBudgets = s.budgets.filter((b) => b.month === fromMonth)
        if (fromBudgets.length === 0) return s
        const budgets = [...s.budgets]
        for (const fb of fromBudgets) {
          const carry = carryovers[fb.categoryId] ?? 0
          const idx = budgets.findIndex(
            (b) => b.categoryId === fb.categoryId && b.month === toMonth
          )
          if (idx >= 0) {
            const ex = budgets[idx]
            budgets[idx] = { ...ex, carryover: String(parseSigned(ex.carryover) + carry) }
          } else {
            budgets.push({
              id: generateId(),
              categoryId: fb.categoryId,
              month: toMonth,
              limit: fb.limit,
              currency: fb.currency,
              carryover: String(carry),
            })
          }
        }
        const concludedMonths = s.concludedMonths.includes(fromMonth)
          ? s.concludedMonths
          : [...s.concludedMonths, fromMonth]
        return { ...s, budgets, concludedMonths }
      })
    },
    []
  )

  /* ── Preferencias ── */
  const setDisplayCurrency = useCallback((displayCurrency: CurrencyId) =>
    setState((s) => ({ ...s, displayCurrency })), [])

  const setStatsRateSource = useCallback((statsRateSource: RateId) =>
    setState((s) => ({ ...s, statsRateSource })), [])

  const setTimeRange = useCallback((timeRange: TimeRange) =>
    setState((s) => ({ ...s, timeRange })), [])

  const clearAll = useCallback(() => setState({ ...DEFAULT_STATE }), [])

  /* ── Derivados sin tasas ── */
  const accountBalances = useMemo<AccountBalance[]>(() => {
    return state.accounts.map((account) => {
      let balance = parseAmount(account.openingBalance)
      for (const tx of state.transactions) {
        if (tx.accountId !== account.id) continue
        balance += tx.type === 'income' ? parseAmount(tx.amount) : -parseAmount(tx.amount)
      }
      for (const tr of state.transfers) {
        if (tr.fromAccountId === account.id) balance -= parseAmount(tr.fromAmount)
        if (tr.toAccountId === account.id) balance += parseAmount(tr.toAmount)
      }
      return { accountId: account.id, currency: account.currency, balance }
    })
  }, [state.accounts, state.transactions, state.transfers])

  const totalsByCurrency = useMemo<Record<CurrencyId, number>>(() => {
    const totals: Record<CurrencyId, number> = { VES: 0, USD: 0, EUR: 0 }
    for (const b of accountBalances) totals[b.currency] += b.balance
    return totals
  }, [accountBalances])

  const filteredTransactions = useMemo(
    () => filterByRange(state.transactions, state.timeRange),
    [state.transactions, state.timeRange]
  )

  const hasData = state.accounts.length > 0

  /* ── Estado de presupuestos de un mes (requiere tasas) ── */
  const budgetStatusForMonth = useCallback(
    (rates: Rates, month: string): BudgetStatusRow[] => {
      const { statsRateSource } = state
      const accountById = new Map(state.accounts.map((a) => [a.id, a]))
      const categoryById = new Map(state.categories.map((c) => [c.id, c]))
      return state.budgets
        .filter((b) => b.month === month)
        .map((budget) => {
          const cat = categoryById.get(budget.categoryId)
          let actual = 0
          for (const tx of state.transactions) {
            if (tx.type !== 'expense' || tx.categoryId !== budget.categoryId) continue
            if (monthKey(tx.date) !== month) continue
            const acct = accountById.get(tx.accountId)
            if (!acct) continue
            actual += normalize(
              parseAmount(tx.amount),
              acct.currency,
              budget.currency,
              rates,
              statsRateSource
            )
          }
          const limit = parseAmount(budget.limit)
          const carryover = parseSigned(budget.carryover)
          const effectiveLimit = limit + carryover
          const ratio = effectiveLimit > 0 ? actual / effectiveLimit : actual > 0 ? Infinity : 0
          return {
            budget,
            categoryName: cat?.name ?? 'Desconocida',
            categoryIcon: cat?.icon ?? 'other',
            actual,
            limit,
            carryover,
            effectiveLimit,
            ratio,
            isOver: effectiveLimit > 0 && actual > effectiveLimit,
          }
        })
    },
    [state]
  )

  /* ── Estadísticas (requieren tasas en vivo) ── */
  const computeStats = useCallback(
    (rates: Rates): StatsBundle => {
      const { displayCurrency, statsRateSource, timeRange } = state
      const accountById = new Map(state.accounts.map((a) => [a.id, a]))
      const categoryById = new Map(state.categories.map((c) => [c.id, c]))
      const txs = filterByRange(state.transactions, timeRange)

      const norm = (amount: number, fromCur: CurrencyId, toCur: CurrencyId) =>
        normalize(amount, fromCur, toCur, rates, statsRateSource)

      // Ingresos vs gastos + agregados por categoría y por mes
      const incomeVsExpense = { income: 0, expense: 0 }
      const byCat = new Map<string, number>()
      const byMonth = new Map<string, { income: number; expense: number }>()

      for (const tx of txs) {
        const acct = accountById.get(tx.accountId)
        if (!acct) continue
        const value = norm(parseAmount(tx.amount), acct.currency, displayCurrency)
        incomeVsExpense[tx.type] += value
        byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + value)
        const mk = monthKey(tx.date)
        const bucket = byMonth.get(mk) ?? { income: 0, expense: 0 }
        bucket[tx.type] += value
        byMonth.set(mk, bucket)
      }

      const categorySummary: CategorySummaryRow[] = [...byCat.entries()]
        .map(([categoryId, total]) => {
          const cat = categoryById.get(categoryId)
          return {
            categoryId,
            name: cat?.name ?? 'Desconocida',
            icon: cat?.icon ?? 'other',
            color: cat?.color,
            kind: cat?.kind ?? 'expense',
            total,
          }
        })
        .sort((a, b) => b.total - a.total)

      const monthlySeries: MonthlyPoint[] = [...byMonth.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([month, v]) => ({ month, label: formatMonthLabel(month), ...v }))

      // Patrimonio neto (todas las cuentas, normalizado)
      let netWorth = 0
      for (const account of state.accounts) {
        let balance = parseAmount(account.openingBalance)
        for (const tx of state.transactions) {
          if (tx.accountId !== account.id) continue
          balance += tx.type === 'income' ? parseAmount(tx.amount) : -parseAmount(tx.amount)
        }
        for (const tr of state.transfers) {
          if (tr.fromAccountId === account.id) balance -= parseAmount(tr.fromAmount)
          if (tr.toAccountId === account.id) balance += parseAmount(tr.toAmount)
        }
        netWorth += norm(balance, account.currency, displayCurrency)
      }

      // Presupuesto vs gasto real (mes actual)
      const budgetStatus = budgetStatusForMonth(rates, monthKey(new Date()))

      // ¿Tenemos todas las tasas necesarias para normalizar?
      const usedCurrencies = new Set<CurrencyId>([displayCurrency])
      state.accounts.forEach((a) => usedCurrencies.add(a.currency))
      state.budgets.forEach((b) => usedCurrencies.add(b.currency))
      const ratesAvailable = [...usedCurrencies].every(
        (c) => bsPerUnit(c, rates, statsRateSource) > 0
      )

      return { incomeVsExpense, categorySummary, monthlySeries, netWorth, budgetStatus, ratesAvailable }
    },
    [state, budgetStatusForMonth]
  )

  return {
    state,
    isMounted,
    hasData,
    accountBalances,
    totalsByCurrency,
    filteredTransactions,
    computeStats,
    budgetStatusForMonth,
    // Cuentas
    addAccount,
    updateAccount,
    removeAccount,
    // Transacciones
    addTransaction,
    updateTransaction,
    removeTransaction,
    // Traspasos
    addTransfer,
    removeTransfer,
    // Categorías
    addCategory,
    updateCategory,
    removeCategory,
    // Presupuestos
    setBudget,
    removeBudget,
    concludeBudgetMonth,
    // Preferencias
    setDisplayCurrency,
    setStatsRateSource,
    setTimeRange,
    clearAll,
  }
}
