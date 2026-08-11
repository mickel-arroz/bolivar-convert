'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { Rates, RateId } from '@/constants/rates'
import { generateId, parseAmount } from '@/hooks/useBillSplitter'
import { DEFAULT_CATEGORIES } from '@/constants/walletCategories'
import { buildWalletDelta, isEmptyDelta } from '@/lib/wallet/delta'
import { notify } from '@/lib/notify'
import {
  filterByRange,
  parseSigned,
  bsPerUnit,
  normalize,
  resolveCommission,
  computeAccountBalances,
  computeTotalsByCurrency,
  computeStats as computeStatsCore,
  budgetStatusForMonth as budgetStatusForMonthCore,
  DEFAULT_BUDGET_TEMPLATE_ID,
} from '@/lib/wallet/compute'

// Reexport de helpers compartidos para consumidores que los importan desde este módulo.
export { monthKey, formatMonthLabel } from '@/lib/wallet/compute'

/* ─── Tipos ─── */
export type TransactionType = 'income' | 'expense'

/** Cómo se interpreta el valor de una comisión: porcentaje del monto o monto fijo. */
export type CommissionType = 'percent' | 'fixed'

export interface Account {
  id: string
  name: string
  currency: CurrencyId
  openingBalance: string
  /** Clave de icono (ver ACCOUNT_ICON_MAP). Reutilizable entre cuentas. */
  icon: string
  /** Color personalizado (string CSS, p.ej. 'var(--wallet-green)'). Opcional → gris. */
  color?: string
  /** Comisión por defecto de la cuenta (valor); prellenada al crear movimientos. Opcional. */
  commission?: string
  /** Interpretación de `commission`: porcentaje o monto fijo. */
  commissionType?: CommissionType
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
  /** Comisión (costo) del movimiento: reduce el saldo de la cuenta. Opcional. */
  commission?: string
  /** Interpretación de `commission`: porcentaje del monto o monto fijo. */
  commissionType?: CommissionType
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
  /** Comisión (costo) que paga la cuenta origen, sobre `fromAmount`. Opcional. */
  commission?: string
  /** Interpretación de `commission`: porcentaje de `fromAmount` o monto fijo. */
  commissionType?: CommissionType
  note?: string
  date: string
  createdAt: string
}

/** Plantilla de presupuesto: un grupo de presupuestos del usuario. */
export interface BudgetTemplate {
  id: string
  name: string
  /** Descripción muy corta, mostrada en la UI. */
  description?: string
  icon?: string
  color?: string
  /** La plantilla "Predeterminada", siempre presente. */
  isDefault?: boolean
  createdAt: string
}

export interface Budget {
  id: string
  /** Plantilla a la que pertenece el presupuesto. */
  templateId: string
  categoryId: string
  /** Mes al que aplica, formato 'YYYY-MM'. */
  month: string
  /** Estimado del mes (editable, independiente del extra). */
  limit: string
  currency: CurrencyId
  /** Sobrante/déficit arrastrado de meses anteriores (con signo). Independiente de `limit`. */
  carryover?: string
}

/** Traspaso de presupuesto entre categorías al activar otra plantilla (queda en el feed). */
export interface BudgetTransfer {
  id: string
  /** Mes al que aplica, formato 'YYYY-MM'. */
  month: string
  fromTemplateId: string
  fromCategoryId: string
  toTemplateId: string
  toCategoryId: string
  /** Extra movido (con signo) al carryover del destino, en `currency`. */
  extra: string
  /** Gasto trasladado: cuenta como gastado en el destino, en `currency`. */
  spent: string
  /** Moneda del presupuesto destino. */
  currency: CurrencyId
  date: string
  createdAt: string
}

/** Entrada de un traspaso al activar una plantilla (montos en la moneda del destino). */
export interface BudgetTransferInput {
  fromCategoryId: string
  toCategoryId: string
  extra: number
  spent: number
  currency: CurrencyId
}

/** Meta de ahorro / alcancía. No está atada a un mes. */
export interface Goal {
  id: string
  name: string
  currency: CurrencyId
  /** Objetivo opcional (para la barra de progreso). */
  target?: string
  icon?: string
  color?: string
  createdAt: string
}

/** Movimiento de dinero hacia/desde una meta (misma moneda que la meta). */
export interface GoalContribution {
  id: string
  goalId: string
  /** Cuenta afectada (misma moneda que la meta). undefined = viene de un extra de presupuesto. */
  accountId?: string
  /** Monto en la moneda de la meta. Positivo = aporta; negativo = retira. */
  amount: string
  note?: string
  date: string
  createdAt: string
}

export interface ShoppingList {
  id: string
  name: string
  icon?: string
  color?: string
  createdAt: string
}

export interface ShoppingPurchase {
  accountId: string
  cost: string
  rate?: { source: TransferRateSource; value: string }
  transactionId: string
  date: string
}

export interface ShoppingListItem {
  id: string
  listId: string
  title: string
  description?: string
  price: string
  currency: CurrencyId
  purchased: boolean
  purchase?: ShoppingPurchase
  createdAt: string
}

export type TimeRange = '1m' | '6m' | '1y' | 'all'

export interface WalletState {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
  categories: Category[]
  budgets: Budget[]
  budgetTemplates: BudgetTemplate[]
  budgetTransfers: BudgetTransfer[]
  goals: Goal[]
  goalContributions: GoalContribution[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingListItem[]
  /** Meses 'YYYY-MM' cuyo presupuesto ya fue concluido (no se vuelve a avisar). */
  concludedMonths: string[]
  /** Plantilla de presupuesto activa (sus presupuestos son los del mes visibles). */
  activeBudgetTemplateId: string
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

export interface GoalBalance {
  goalId: string
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
  /** Color asignado por el usuario a la categoría (para mostrar el icono en su color). */
  categoryColor?: string
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

/** Punto de la serie de patrimonio neto acumulado por mes (normalizado). */
export interface NetWorthPoint {
  month: string
  label: string
  value: number
}

export interface StatsBundle {
  incomeVsExpense: { income: number; expense: number }
  categorySummary: CategorySummaryRow[]
  monthlySeries: MonthlyPoint[]
  netWorth: number
  /** Patrimonio neto acumulado por mes (según el rango seleccionado). */
  netWorthSeries: NetWorthPoint[]
  budgetStatus: BudgetStatusRow[]
  /** false si falta alguna tasa necesaria para normalizar (ej. '---'). */
  ratesAvailable: boolean
}

/* ─── Almacenamiento ─── */
/** Clave del localStorage legado (previo a la nube). Reutilizada por la migración. */
export const WALLET_STORAGE_KEY = 'bolivar_wallet_v1'

export { DEFAULT_BUDGET_TEMPLATE_ID } from '@/lib/wallet/compute'

/** Plantilla por defecto sembrada en la primera carga (id fijo, como las categorías). */
export const DEFAULT_BUDGET_TEMPLATE: BudgetTemplate = {
  id: DEFAULT_BUDGET_TEMPLATE_ID,
  name: 'Predeterminada',
  isDefault: true,
  // Fecha fija: el sembrado es idempotente y no genera churn de sync.
  createdAt: '1970-01-01T00:00:00.000Z',
}

export const DEFAULT_STATE: WalletState = {
  accounts: [],
  transactions: [],
  transfers: [],
  categories: DEFAULT_CATEGORIES,
  budgets: [],
  budgetTemplates: [DEFAULT_BUDGET_TEMPLATE],
  budgetTransfers: [],
  goals: [],
  goalContributions: [],
  shoppingLists: [],
  shoppingItems: [],
  concludedMonths: [],
  displayCurrency: 'VES',
  statsRateSource: 'bcvUsd',
  timeRange: '1m',
  activeBudgetTemplateId: DEFAULT_BUDGET_TEMPLATE_ID,
}

/**
 * Garantiza el invariante de plantillas: existe la plantilla por defecto, la activa es
 * válida, y todo presupuesto tiene `templateId` (los legados se asignan a la activa).
 */
export function normalizeTemplates(state: WalletState): WalletState {
  const templates =
    state.budgetTemplates.length > 0 ? state.budgetTemplates : [DEFAULT_BUDGET_TEMPLATE]
  const hasDefault = templates.some((t) => t.id === DEFAULT_BUDGET_TEMPLATE_ID)
  const budgetTemplates = hasDefault ? templates : [DEFAULT_BUDGET_TEMPLATE, ...templates]
  const activeBudgetTemplateId = budgetTemplates.some((t) => t.id === state.activeBudgetTemplateId)
    ? state.activeBudgetTemplateId
    : DEFAULT_BUDGET_TEMPLATE_ID
  const budgets = state.budgets.some((b) => !b.templateId)
    ? state.budgets.map((b) => (b.templateId ? b : { ...b, templateId: DEFAULT_BUDGET_TEMPLATE_ID }))
    : state.budgets
  return { ...state, budgetTemplates, activeBudgetTemplateId, budgets }
}

/**
 * Combina las categorías guardadas con las por defecto: refresca la definición
 * (nombre/ícono/color) de las categorías por defecto desde el código, conserva las
 * creadas por el usuario y anexa cualquier categoría por defecto nueva.
 */
export function mergeCategories(stored: Category[] | undefined): Category[] {
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

/** Margen para comparaciones de saldo (evita rechazos por error de coma flotante). */
const OVERDRAW_EPS = 1e-6

export function useWallet() {
  const [isMounted, setIsMounted] = useState(false)
  const [state, setState] = useState<WalletState>(DEFAULT_STATE)
  const [loadError, setLoadError] = useState(false)
  const [syncError, setSyncError] = useState(false)
  // Contador que aumenta tras cada sync exitoso; los tabs con endpoints dedicados
  // lo usan como señal para re-consultar sus datos ya persistidos.
  const [syncedVersion, setSyncedVersion] = useState(0)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Último estado confirmado en la nube; base para calcular el delta a persistir.
  const lastSyncedRef = useRef<WalletState | null>(null)
  // Cola para serializar las escrituras y evitar solapamientos.
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve())

  // Aplica el estado cargado desde la nube: hidrata `state` (con defaults sembrados)
  // y fija la base de sync a lo que realmente hay en la nube.
  const applyLoaded = useCallback((loaded: Partial<WalletState>) => {
    const merged: WalletState = {
      ...DEFAULT_STATE,
      ...loaded,
      // Backfill: cuentas guardadas antes de tener icono → 'wallet'
      accounts: (loaded.accounts ?? []).map((a) => ({ ...a, icon: a.icon ?? 'wallet' })),
      transactions: loaded.transactions ?? [],
      transfers: loaded.transfers ?? [],
      // Refresca las categorías por defecto (por id) desde el código y conserva
      // las del usuario; si no hay ninguna guardada, siembra las por defecto.
      categories: mergeCategories(loaded.categories),
      budgets: loaded.budgets ?? [],
      budgetTemplates: loaded.budgetTemplates ?? [],
      budgetTransfers: loaded.budgetTransfers ?? [],
      goals: loaded.goals ?? [],
      goalContributions: loaded.goalContributions ?? [],
      shoppingLists: loaded.shoppingLists ?? [],
      shoppingItems: loaded.shoppingItems ?? [],
      concludedMonths: loaded.concludedMonths ?? [],
      activeBudgetTemplateId: loaded.activeBudgetTemplateId ?? DEFAULT_BUDGET_TEMPLATE_ID,
    }
    // Base = lo que realmente hay en la nube (sin sembrados del código), para que el
    // primer sync inserte cualquier default nuevo (categorías / plantilla por defecto).
    lastSyncedRef.current = {
      ...DEFAULT_STATE,
      ...loaded,
      categories: loaded.categories ?? [],
      budgetTemplates: loaded.budgetTemplates ?? [],
      // '' fuerza el push del puntero activo si la nube aún no lo tiene.
      activeBudgetTemplateId: loaded.activeBudgetTemplateId ?? '',
    }
    setState(normalizeTemplates(merged))
  }, [])

  // Carga (o recarga) la billetera desde nuestra API. Devuelve false si no hay sesión.
  const hydrate = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/wallet/state')
    if (res.status === 401) return false // sin sesión
    if (!res.ok) throw new Error('No se pudo cargar la billetera')
    const loaded = (await res.json()) as Partial<WalletState>
    applyLoaded(loaded)
    return true
  }, [applyLoaded])

  // Hidratar desde nuestra API al montar (el cliente no habla con Supabase directo;
  // el middleware protege /billetera, así que aquí hay sesión).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await hydrate()
      } catch (e) {
        console.error('[wallet load]', e)
        if (!cancelled) {
          setLoadError(true)
          notify.error('No se pudo cargar tu billetera', 'Intenta recargar la página.')
        }
      } finally {
        if (!cancelled) setIsMounted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrate])

  // Persistir en la nube el delta respecto al último estado confirmado, vía /api/wallet/sync.
  useEffect(() => {
    if (!isMounted) return
    const base = lastSyncedRef.current
    if (!base) return
    const snapshot = state
    if (snapshot === base) return

    syncQueueRef.current = syncQueueRef.current.then(async () => {
      const from = lastSyncedRef.current
      if (!from || from === snapshot) return
      const delta = buildWalletDelta(from, snapshot)
      if (isEmptyDelta(delta)) {
        lastSyncedRef.current = snapshot
        return
      }
      try {
        const res = await fetch('/api/wallet/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(delta),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || 'sync failed')
        }
        lastSyncedRef.current = snapshot
        setSyncError(false)
        setSyncedVersion((v) => v + 1)
      } catch (e) {
        console.error('[wallet sync]', e)
        setSyncError(true)
        const msg = e instanceof Error ? e.message : ''
        notify.error(
          'No se pudieron guardar los cambios',
          msg && msg !== 'sync failed' ? msg : 'Se reintentará automáticamente.'
        )
      }
    })
  }, [state, isMounted])

  /** Saldo de una cuenta en un estado dado (fuente de verdad: computeAccountBalances). */
  const accountBalanceOf = useCallback((accountId: string, s: WalletState): number => {
    const found = computeAccountBalances({
      accounts: s.accounts,
      transactions: s.transactions,
      transfers: s.transfers,
      goalContributions: s.goalContributions,
    }).find((b) => b.accountId === accountId)
    return found?.balance ?? 0
  }, [])

  /* ── Cuentas ── */
  const addAccount = useCallback(
    (
      name: string,
      currency: CurrencyId,
      openingBalance: string,
      icon = 'wallet',
      color?: string,
      commission?: string,
      commissionType?: CommissionType
    ) => {
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
            color,
            commission: commission || undefined,
            commissionType: commission ? commissionType : undefined,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
    },
    []
  )

  const updateAccount = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<Account, 'name' | 'currency' | 'openingBalance' | 'icon' | 'color' | 'commission' | 'commissionType'>
      >
    ) => {
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }))
    },
    []
  )

  /**
   * Fija el saldo mostrado de una cuenta a `targetBalance` ajustando `openingBalance`
   * (saldo como variable): dado que el saldo = openingBalance + Σmovimientos, se calcula
   * openingBalance = targetBalance − Σmovimientos, de modo que el saldo pase a `targetBalance`
   * y los movimientos posteriores lo sigan afectando desde ahí.
   */
  const setAccountBalance = useCallback((id: string, targetBalance: number) => {
    setState((s) => {
      const account = s.accounts.find((a) => a.id === id)
      if (!account) return s
      let movements = 0
      for (const tx of s.transactions) {
        if (tx.accountId !== id) continue
        const amt = parseAmount(tx.amount)
        movements += tx.type === 'income' ? amt : -amt
        movements -= resolveCommission(amt, tx.commission, tx.commissionType)
      }
      for (const tr of s.transfers) {
        if (tr.fromAccountId === id) {
          movements -= parseAmount(tr.fromAmount)
          movements -= resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
        }
        if (tr.toAccountId === id) movements += parseAmount(tr.toAmount)
      }
      const newOpening = targetBalance - movements
      return {
        ...s,
        accounts: s.accounts.map((a) =>
          a.id === id ? { ...a, openingBalance: String(newOpening) } : a
        ),
      }
    })
  }, [])

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
    (tx: {
      type: TransactionType
      accountId: string
      categoryId: string
      amount: string
      commission?: string
      commissionType?: CommissionType
      note?: string
      date: string
    }): boolean => {
      if (parseAmount(tx.amount) <= 0 || !tx.accountId || !tx.categoryId) return false
      const s = stateRef.current
      const amt = parseAmount(tx.amount)
      const commission = resolveCommission(amt, tx.commission, tx.commissionType)
      const delta = tx.type === 'income' ? amt - commission : -(amt + commission)
      if (delta < 0 && accountBalanceOf(tx.accountId, s) + delta < -OVERDRAW_EPS) return false
      setState((s2) => ({
        ...s2,
        transactions: [
          ...s2.transactions,
          {
            id: generateId(),
            type: tx.type,
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            amount: tx.amount,
            commission: tx.commission || undefined,
            commissionType: tx.commission ? tx.commissionType : undefined,
            note: tx.note?.trim() || undefined,
            date: tx.date,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return true
    },
    [accountBalanceOf]
  )

  const updateTransaction = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Transaction,
          'type' | 'accountId' | 'categoryId' | 'amount' | 'commission' | 'commissionType' | 'note' | 'date'
        >
      >
    ): boolean => {
      const s = stateRef.current
      const old = s.transactions.find((t) => t.id === id)
      if (!old) return false
      const nextState: WalletState = {
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }
      const affected = new Set<string>([old.accountId])
      if (patch.accountId) affected.add(patch.accountId)
      for (const accId of affected) {
        const after = accountBalanceOf(accId, nextState)
        const before = accountBalanceOf(accId, s)
        if (after < -OVERDRAW_EPS && after < before - OVERDRAW_EPS) return false
      }
      setState((s2) => ({
        ...s2,
        transactions: s2.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
      return true
    },
    [accountBalanceOf]
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
      /** Monto que llega a la cuenta destino (editable, contempla comisiones). */
      toAmount: string
      rateSource: TransferRateSource
      rateValue: number
      /** Comisión (costo) que paga la cuenta origen, sobre `fromAmount`. */
      commission?: string
      commissionType?: CommissionType
      note?: string
      date: string
    }): boolean => {
      const {
        fromAccountId,
        toAccountId,
        fromAmount,
        toAmount,
        rateSource,
        rateValue,
        commission,
        commissionType,
        note,
        date,
      } = params
      if (fromAccountId === toAccountId) return false
      const amount = parseAmount(fromAmount)
      const received = parseAmount(toAmount)
      if (amount <= 0 || received <= 0) return false
      const s0 = stateRef.current
      if (!s0.accounts.some((a) => a.id === fromAccountId) || !s0.accounts.some((a) => a.id === toAccountId))
        return false
      const debit = amount + resolveCommission(amount, commission, commissionType)
      if (accountBalanceOf(fromAccountId, s0) - debit < -OVERDRAW_EPS) return false
      setState((s) => {
        const from = s.accounts.find((a) => a.id === fromAccountId)
        const to = s.accounts.find((a) => a.id === toAccountId)
        if (!from || !to) return s
        const sameCurrency = from.currency === to.currency
        const transfer: Transfer = {
          id: generateId(),
          fromAccountId,
          toAccountId,
          fromAmount,
          toAmount,
          // La tasa se guarda solo como referencia cuando las monedas difieren.
          rate: sameCurrency ? undefined : { source: rateSource, value: String(rateValue) },
          commission: commission || undefined,
          commissionType: commission ? commissionType : undefined,
          note: note?.trim() || undefined,
          date,
          createdAt: new Date().toISOString(),
        }
        return { ...s, transfers: [...s.transfers, transfer] }
      })
      return true
    },
    [accountBalanceOf]
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

  /**
   * Elimina una categoría (incluidas las por defecto) junto con sus transacciones y
   * presupuestos asociados. Protección: nunca borra la última categoría que quede.
   */
  const removeCategory = useCallback((id: string) => {
    setState((s) => {
      if (s.categories.length <= 1) return s
      const cat = s.categories.find((c) => c.id === id)
      if (!cat) return s
      return {
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        transactions: s.transactions.filter((t) => t.categoryId !== id),
        budgets: s.budgets.filter((b) => b.categoryId !== id),
      }
    })
  }, [])

  /**
   * Reasigna las transacciones de `fromId` a `toId`, fusiona sus presupuestos por mes y
   * elimina la categoría origen. `budgetStrategy` decide qué hacer cuando ambos tienen
   * presupuesto en el mismo mes: 'merge' suma límite y carryover; 'overwrite' reemplaza el
   * del destino por el del origen. Protección: no actúa si dejaría 0 categorías.
   */
  const reassignCategory = useCallback(
    (fromId: string, toId: string, budgetStrategy: 'overwrite' | 'merge') => {
      setState((s) => {
        if (fromId === toId || s.categories.length <= 1) return s
        if (!s.categories.some((c) => c.id === toId)) return s
        const transactions = s.transactions.map((t) =>
          t.categoryId === fromId ? { ...t, categoryId: toId } : t
        )
        const budgets = [...s.budgets]
        const fromBudgets = budgets.filter((b) => b.categoryId === fromId)
        for (const fb of fromBudgets) {
          const idx = budgets.findIndex(
            (b) => b.templateId === fb.templateId && b.categoryId === toId && b.month === fb.month
          )
          if (idx >= 0) {
            const ex = budgets[idx]
            if (budgetStrategy === 'merge') {
              budgets[idx] = {
                ...ex,
                limit: String(parseAmount(ex.limit) + parseAmount(fb.limit)),
                carryover: String(parseSigned(ex.carryover) + parseSigned(fb.carryover)),
              }
            } else {
              budgets[idx] = { ...ex, limit: fb.limit, currency: fb.currency, carryover: fb.carryover }
            }
          } else {
            budgets.push({ ...fb, id: generateId(), categoryId: toId })
          }
        }
        return {
          ...s,
          transactions,
          budgets: budgets.filter((b) => b.categoryId !== fromId),
          categories: s.categories.filter((c) => c.id !== fromId),
        }
      })
    },
    []
  )

  /* ── Presupuestos (upsert por plantilla + categoría + mes) ── */
  const setBudget = useCallback(
    (
      categoryId: string,
      month: string,
      limit: string,
      currency: CurrencyId,
      carryover?: string,
      templateId?: string
    ) => {
      setState((s) => {
        const tid = templateId ?? s.activeBudgetTemplateId
        const existing = s.budgets.find(
          (b) => b.templateId === tid && b.categoryId === categoryId && b.month === month
        )
        if (existing) {
          return {
            ...s,
            budgets: s.budgets.map((b) =>
              b.id === existing.id
                ? { ...b, limit, currency, ...(carryover !== undefined && { carryover }) }
                : b
            ),
          }
        }
        return {
          ...s,
          budgets: [
            ...s.budgets,
            { id: generateId(), templateId: tid, categoryId, month, limit, currency, carryover },
          ],
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
        const tid = s.activeBudgetTemplateId
        const fromBudgets = s.budgets.filter((b) => b.templateId === tid && b.month === fromMonth)
        if (fromBudgets.length === 0) return s
        const budgets = [...s.budgets]
        for (const fb of fromBudgets) {
          const carry = carryovers[fb.categoryId] ?? 0
          const idx = budgets.findIndex(
            (b) => b.templateId === tid && b.categoryId === fb.categoryId && b.month === toMonth
          )
          if (idx >= 0) {
            const ex = budgets[idx]
            budgets[idx] = { ...ex, carryover: String(parseSigned(ex.carryover) + carry) }
          } else {
            budgets.push({
              id: generateId(),
              templateId: tid,
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

  /* ── Plantillas de presupuesto (grupos de presupuestos) ── */
  const addBudgetTemplate = useCallback(
    (input: { name: string; description?: string; icon?: string; color?: string }): string => {
      const id = generateId()
      const trimmed = input.name.trim()
      if (!trimmed) return id
      setState((s) => ({
        ...s,
        budgetTemplates: [
          ...s.budgetTemplates,
          {
            id,
            name: trimmed,
            description: input.description?.trim() || undefined,
            icon: input.icon,
            color: input.color,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return id
    },
    []
  )

  const updateBudgetTemplate = useCallback(
    (id: string, patch: Partial<Pick<BudgetTemplate, 'name' | 'description' | 'icon' | 'color'>>) => {
      setState((s) => ({
        ...s,
        budgetTemplates: s.budgetTemplates.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                ...(patch.name !== undefined && { name: patch.name.trim() }),
                ...(patch.description !== undefined && {
                  description: patch.description.trim() || undefined,
                }),
              }
            : t
        ),
      }))
    },
    []
  )

  /**
   * Elimina una plantilla (nunca la predeterminada) y, en cascada, sus presupuestos.
   * Si era la activa, vuelve a la predeterminada.
   */
  const removeBudgetTemplate = useCallback((id: string) => {
    setState((s) => {
      const tpl = s.budgetTemplates.find((t) => t.id === id)
      if (!tpl || tpl.isDefault) return s
      return {
        ...s,
        budgetTemplates: s.budgetTemplates.filter((t) => t.id !== id),
        budgets: s.budgets.filter((b) => b.templateId !== id),
        activeBudgetTemplateId:
          s.activeBudgetTemplateId === id ? DEFAULT_BUDGET_TEMPLATE_ID : s.activeBudgetTemplateId,
      }
    })
  }, [])

  /**
   * Activa una plantilla para el mes aplicando los traspasos dados: el `extra` se
   * suma al carryover del destino y el `spent` se computa como gastado ahí (vía
   * `BudgetTransfer`). No borra presupuestos de la plantilla anterior ni transacciones.
   */
  const applyBudgetTemplate = useCallback(
    (templateId: string, month: string, transfers: BudgetTransferInput[]) => {
      setState((s) => {
        if (!s.budgetTemplates.some((t) => t.id === templateId)) return s
        const extraByCategory: Record<string, number> = {}
        for (const t of transfers) {
          extraByCategory[t.toCategoryId] = (extraByCategory[t.toCategoryId] ?? 0) + t.extra
        }
        const budgets = s.budgets.map((b) => {
          if (b.templateId !== templateId || b.month !== month) return b
          const add = extraByCategory[b.categoryId]
          if (!add) return b
          return { ...b, carryover: String(parseSigned(b.carryover) + add) }
        })
        const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
        const createdAt = new Date().toISOString()
        const budgetTransfers = [
          ...s.budgetTransfers,
          ...transfers
            .filter((t) => t.extra !== 0 || t.spent !== 0)
            .map((t) => ({
              id: generateId(),
              month,
              fromTemplateId: s.activeBudgetTemplateId,
              fromCategoryId: t.fromCategoryId,
              toTemplateId: templateId,
              toCategoryId: t.toCategoryId,
              extra: String(t.extra),
              spent: String(t.spent),
              currency: t.currency,
              date,
              createdAt,
            })),
        ]
        return { ...s, budgets, budgetTransfers, activeBudgetTemplateId: templateId }
      })
    },
    []
  )

  /* ── Metas / Alcancías ── */
  const addGoal = useCallback(
    (name: string, currency: CurrencyId, target?: string, icon?: string, color?: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setState((s) => ({
        ...s,
        goals: [
          ...s.goals,
          {
            id: generateId(),
            name: trimmed,
            currency,
            target: target || undefined,
            icon,
            color,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
    },
    []
  )

  const updateGoal = useCallback(
    (id: string, patch: Partial<Pick<Goal, 'name' | 'currency' | 'target' | 'icon' | 'color'>>) => {
      setState((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }))
    },
    []
  )

  /** Elimina la meta y, en cascada, sus aportes/retiros (devuelve el efecto sobre cuentas). */
  const removeGoal = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      goals: s.goals.filter((g) => g.id !== id),
      goalContributions: s.goalContributions.filter((c) => c.goalId !== id),
    }))
  }, [])

  /**
   * Mueve dinero entre una cuenta y una meta de su misma moneda.
   * `direction` 'in' = aporta (sale de la cuenta), 'out' = retira (vuelve a la cuenta).
   * El monto se guarda con signo (aporte positivo, retiro negativo).
   */
  const moveToGoal = useCallback(
    (params: {
      goalId: string
      accountId: string
      amount: string
      direction: 'in' | 'out'
      note?: string
      date: string
    }): boolean => {
      const { goalId, accountId, amount, direction, note, date } = params
      const value = parseAmount(amount)
      if (value <= 0) return false
      const s0 = stateRef.current
      const g0 = s0.goals.find((g) => g.id === goalId)
      const a0 = s0.accounts.find((a) => a.id === accountId)
      if (!g0 || !a0 || g0.currency !== a0.currency) return false
      if (direction === 'in' && accountBalanceOf(accountId, s0) - value < -OVERDRAW_EPS) return false
      setState((s) => {
        const goal = s.goals.find((g) => g.id === goalId)
        const account = s.accounts.find((a) => a.id === accountId)
        if (!goal || !account || goal.currency !== account.currency) return s
        const signed = direction === 'in' ? value : -value
        return {
          ...s,
          goalContributions: [
            ...s.goalContributions,
            {
              id: generateId(),
              goalId,
              accountId,
              amount: String(signed),
              note: note?.trim() || undefined,
              date,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
      return true
    },
    [accountBalanceOf]
  )

  /** Asigna un extra de presupuesto a una meta (sin afectar cuentas). Usado al concluir el mes. */
  const allocateExtraToGoal = useCallback((goalId: string, amount: number, date: string) => {
    if (amount <= 0) return
    setState((s) => {
      if (!s.goals.some((g) => g.id === goalId)) return s
      return {
        ...s,
        goalContributions: [
          ...s.goalContributions,
          {
            id: generateId(),
            goalId,
            amount: String(amount),
            note: 'Extra de presupuesto',
            date,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })
  }, [])

  /* ── Listas de compras ── */
  const addShoppingList = useCallback((name: string, icon?: string, color?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((s) => ({
      ...s,
      shoppingLists: [
        ...s.shoppingLists,
        { id: generateId(), name: trimmed, icon, color, createdAt: new Date().toISOString() },
      ],
    }))
  }, [])

  const updateShoppingList = useCallback(
    (id: string, patch: Partial<Pick<ShoppingList, 'name' | 'icon' | 'color'>>) => {
      setState((s) => ({
        ...s,
        shoppingLists: s.shoppingLists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }))
    },
    []
  )

  const removeShoppingList = useCallback((id: string) => {
    setState((s) => {
      const items = s.shoppingItems.filter((it) => it.listId === id)
      const txIds = new Set(
        items.map((it) => it.purchase?.transactionId).filter((t): t is string => !!t)
      )
      return {
        ...s,
        shoppingLists: s.shoppingLists.filter((l) => l.id !== id),
        shoppingItems: s.shoppingItems.filter((it) => it.listId !== id),
        transactions: s.transactions.filter((t) => !txIds.has(t.id)),
      }
    })
  }, [])

  const addShoppingItem = useCallback(
    (item: {
      listId: string
      title: string
      description?: string
      price: string
      currency: CurrencyId
    }) => {
      const trimmed = item.title.trim()
      if (!trimmed || !item.listId) return
      setState((s) => {
        if (!s.shoppingLists.some((l) => l.id === item.listId)) return s
        return {
          ...s,
          shoppingItems: [
            ...s.shoppingItems,
            {
              id: generateId(),
              listId: item.listId,
              title: trimmed,
              description: item.description?.trim() || undefined,
              price: item.price || '0',
              currency: item.currency,
              purchased: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
    },
    []
  )

  const updateShoppingItem = useCallback(
    (
      id: string,
      patch: Partial<Pick<ShoppingListItem, 'title' | 'description' | 'price' | 'currency'>>
    ) => {
      setState((s) => ({
        ...s,
        shoppingItems: s.shoppingItems.map((it) =>
          it.id === id
            ? {
                ...it,
                ...patch,
                ...(patch.title !== undefined && { title: patch.title.trim() }),
                ...(patch.description !== undefined && {
                  description: patch.description.trim() || undefined,
                }),
              }
            : it
        ),
      }))
    },
    []
  )

  const removeShoppingItem = useCallback((id: string) => {
    setState((s) => {
      const item = s.shoppingItems.find((it) => it.id === id)
      const txId = item?.purchase?.transactionId
      return {
        ...s,
        shoppingItems: s.shoppingItems.filter((it) => it.id !== id),
        transactions: txId ? s.transactions.filter((t) => t.id !== txId) : s.transactions,
      }
    })
  }, [])

  const confirmPurchase = useCallback(
    (params: {
      itemId: string
      accountId: string
      cost: string
      rateSource: TransferRateSource
      rateValue: number
      date: string
    }): boolean => {
      const { itemId, accountId, cost, rateSource, rateValue, date } = params
      const costNum = parseAmount(cost)
      if (costNum <= 0) return false
      const s0 = stateRef.current
      const item0 = s0.shoppingItems.find((it) => it.id === itemId)
      const account0 = s0.accounts.find((a) => a.id === accountId)
      if (!item0 || !account0) return false
      const debited0 =
        item0.currency === account0.currency
          ? costNum
          : convertTransferAmount(costNum, item0.currency, account0.currency, rateValue)
      if (debited0 <= 0) return false
      if (accountBalanceOf(accountId, s0) - debited0 < -OVERDRAW_EPS) return false
      setState((s) => {
        const item = s.shoppingItems.find((it) => it.id === itemId)
        const account = s.accounts.find((a) => a.id === accountId)
        if (!item || !account) return s
        const sameCurrency = item.currency === account.currency
        const debited = sameCurrency
          ? costNum
          : convertTransferAmount(costNum, item.currency, account.currency, rateValue)
        if (debited <= 0) return s
        const category =
          s.categories.find((c) => c.id === 'cat_shopping') ??
          s.categories.find((c) => c.kind === 'expense')
        if (!category) return s
        const txId = generateId()
        const transaction: Transaction = {
          id: txId,
          type: 'expense',
          accountId,
          categoryId: category.id,
          amount: String(debited),
          note: item.title,
          date,
          createdAt: new Date().toISOString(),
        }
        return {
          ...s,
          transactions: [...s.transactions, transaction],
          shoppingItems: s.shoppingItems.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  purchased: true,
                  purchase: {
                    accountId,
                    cost,
                    rate: sameCurrency ? undefined : { source: rateSource, value: String(rateValue) },
                    transactionId: txId,
                    date,
                  },
                }
              : it
          ),
        }
      })
      return true
    },
    [accountBalanceOf]
  )

  const undoPurchase = useCallback((itemId: string) => {
    setState((s) => {
      const item = s.shoppingItems.find((it) => it.id === itemId)
      if (!item || !item.purchased) return s
      const txId = item.purchase?.transactionId
      return {
        ...s,
        transactions: txId ? s.transactions.filter((t) => t.id !== txId) : s.transactions,
        shoppingItems: s.shoppingItems.map((it) =>
          it.id === itemId ? { ...it, purchased: false, purchase: undefined } : it
        ),
      }
    })
  }, [])

  /* ── Preferencias ── */
  const setDisplayCurrency = useCallback((displayCurrency: CurrencyId) =>
    setState((s) => ({ ...s, displayCurrency })), [])

  const setStatsRateSource = useCallback((statsRateSource: RateId) =>
    setState((s) => ({ ...s, statsRateSource })), [])

  const setTimeRange = useCallback((timeRange: TimeRange) =>
    setState((s) => ({ ...s, timeRange })), [])

  const clearAll = useCallback(() => setState({ ...DEFAULT_STATE }), [])

  /**
   * Restablece la billetera en la nube y re-hidrata desde el servidor.
   * - 'money': vacía saldos, presupuestos, metas y movimientos (conserva los elementos).
   * - 'all': borra todo, dejando al usuario como recién registrado.
   * Devuelve true si tuvo éxito. Al re-hidratar, ajusta `state` y la base de sync a la
   * verdad del servidor para que ningún delta posterior re-suba lo eliminado.
   */
  const resetWallet = useCallback(
    async (mode: 'money' | 'all'): Promise<boolean> => {
      try {
        const res = await fetch('/api/wallet/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || 'reset failed')
        }
        await hydrate()
        setSyncError(false)
        setSyncedVersion((v) => v + 1)
        return true
      } catch (e) {
        console.error('[wallet reset]', e)
        const msg = e instanceof Error ? e.message : ''
        notify.error(
          'No se pudo restablecer la billetera',
          msg && msg !== 'reset failed' ? msg : 'Intenta de nuevo.'
        )
        return false
      }
    },
    [hydrate]
  )

  /* ── Derivados sin tasas ── */
  const accountBalances = useMemo<AccountBalance[]>(
    () =>
      computeAccountBalances({
        accounts: state.accounts,
        transactions: state.transactions,
        transfers: state.transfers,
        goalContributions: state.goalContributions,
      }),
    [state.accounts, state.transactions, state.transfers, state.goalContributions]
  )

  const goalBalances = useMemo<GoalBalance[]>(() => {
    return state.goals.map((goal) => {
      let balance = 0
      for (const gc of state.goalContributions) {
        if (gc.goalId === goal.id) balance += parseSigned(gc.amount)
      }
      return { goalId: goal.id, currency: goal.currency, balance }
    })
  }, [state.goals, state.goalContributions])

  const totalsByCurrency = useMemo<Record<CurrencyId, number>>(
    () => computeTotalsByCurrency(accountBalances),
    [accountBalances]
  )

  /**
   * Patrimonio neto convertido a `currency`: suma de TODAS las cuentas normalizadas
   * a esa moneda con las tasas actuales. `ratesAvailable` es false si falta alguna
   * tasa necesaria para convertir.
   */
  const netWorthIn = useCallback(
    (currency: CurrencyId, rates: Rates): { value: number; ratesAvailable: boolean } => {
      const usedCurrencies = new Set<CurrencyId>([currency])
      for (const b of accountBalances) usedCurrencies.add(b.currency)
      const ratesAvailable = [...usedCurrencies].every(
        (c) => bsPerUnit(c, rates, state.statsRateSource) > 0
      )
      let value = 0
      for (const b of accountBalances) {
        value += normalize(b.balance, b.currency, currency, rates, state.statsRateSource)
      }
      return { value, ratesAvailable }
    },
    [accountBalances, state.statsRateSource]
  )

  const filteredTransactions = useMemo(
    () => filterByRange(state.transactions, state.timeRange),
    [state.transactions, state.timeRange]
  )

  const hasData = state.accounts.length > 0

  /* ── Estado de presupuestos de un mes (requiere tasas) ── */
  const budgetStatusForMonth = useCallback(
    (rates: Rates, month: string): BudgetStatusRow[] =>
      budgetStatusForMonthCore(
        {
          accounts: state.accounts,
          categories: state.categories,
          budgets: state.budgets.filter((b) => b.templateId === state.activeBudgetTemplateId),
          transactions: state.transactions,
          budgetTransfers: state.budgetTransfers,
        },
        rates,
        state.statsRateSource,
        month
      ),
    [state]
  )

  /* ── Estadísticas (requieren tasas en vivo) ── */
  const computeStats = useCallback(
    (rates: Rates): StatsBundle =>
      computeStatsCore(
        {
          accounts: state.accounts,
          transactions: state.transactions,
          transfers: state.transfers,
          categories: state.categories,
          budgets: state.budgets.filter((b) => b.templateId === state.activeBudgetTemplateId),
          budgetTransfers: state.budgetTransfers,
        },
        rates,
        {
          displayCurrency: state.displayCurrency,
          statsRateSource: state.statsRateSource,
          timeRange: state.timeRange,
        }
      ),
    [state]
  )

  return {
    state,
    isMounted,
    loadError,
    syncError,
    syncedVersion,
    hasData,
    accountBalances,
    goalBalances,
    totalsByCurrency,
    netWorthIn,
    filteredTransactions,
    computeStats,
    budgetStatusForMonth,
    // Cuentas
    addAccount,
    updateAccount,
    setAccountBalance,
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
    reassignCategory,
    // Presupuestos
    setBudget,
    removeBudget,
    concludeBudgetMonth,
    // Plantillas de presupuesto
    addBudgetTemplate,
    updateBudgetTemplate,
    removeBudgetTemplate,
    applyBudgetTemplate,
    // Metas
    addGoal,
    updateGoal,
    removeGoal,
    moveToGoal,
    allocateExtraToGoal,
    // Listas de compras
    addShoppingList,
    updateShoppingList,
    removeShoppingList,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    confirmPurchase,
    undoPurchase,
    // Preferencias
    setDisplayCurrency,
    setStatsRateSource,
    setTimeRange,
    clearAll,
    resetWallet,
  }
}
