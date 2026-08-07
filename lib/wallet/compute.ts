/**
 * Cálculos puros de la billetera (balances, normalización de monedas y estadísticas).
 *
 * Módulo neutro (sin React ni acceso a red): lo usan tanto el cliente (`useWallet`)
 * como los route handlers `/api/wallet/*`, para tener una única fuente de verdad y
 * que el cálculo del navegador y el del servidor nunca diverjan.
 */
import type { CurrencyId } from '@/constants/currencies'
import type { Rates, RateId } from '@/constants/rates'
import type {
  Account,
  Transaction,
  Transfer,
  Budget,
  BudgetTransfer,
  GoalContribution,
  Category,
  CommissionType,
  TimeRange,
  AccountBalance,
  StatsBundle,
  CategorySummaryRow,
  MonthlyPoint,
  NetWorthPoint,
  BudgetStatusRow,
} from '@/hooks/useWallet'

/** Id fijo de la plantilla de presupuesto por defecto (ver migración 0004). */
export const DEFAULT_BUDGET_TEMPLATE_ID = 'tpl_default'

/* ─── Parseo numérico ─── */

/** Parsea un monto (acepta coma o punto). 0 si es inválido. */
export function parseAmount(value: string | undefined): number {
  const n = parseFloat(String(value ?? '0').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/** Igual que {@link parseAmount} pero conserva el signo (para el carryover/deudas). */
export function parseSigned(value: string | undefined): number {
  return parseAmount(value)
}

/** Monto de una comisión: `fixed` = valor tal cual; `percent` (default) = % de `base`. 0 si no hay. */
export function resolveCommission(
  base: number,
  commission?: string,
  type?: CommissionType
): number {
  const c = parseAmount(commission)
  if (c <= 0) return 0
  return type === 'fixed' ? c : (base * c) / 100
}

/** Id virtual para agrupar las comisiones en el desglose por categoría. */
export const COMMISSION_CATEGORY_ID = '__commission__'

function rateNum(r: string | undefined): number {
  const n = parseFloat(r ?? '0')
  return isNaN(n) ? 0 : n
}

/* ─── Fechas ─── */

/** Clave de mes 'YYYY-MM' (sin desfase de zona para cadenas 'YYYY-MM-DD'). */
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

/** Lista de claves de mes 'YYYY-MM' desde `startKey` hasta `endKey` (inclusive). */
export function enumerateMonths(startKey: string, endKey: string): string[] {
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  const out: string[] = []
  let y = sy
  let m = sm
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard < 600) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
    guard++
  }
  return out
}

export function rangeStart(range: TimeRange, now = new Date()): Date {
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

export function filterByRange(transactions: Transaction[], range: TimeRange): Transaction[] {
  if (range === 'all') return transactions
  const start = rangeStart(range)
  return transactions.filter((tx) => new Date(tx.date) >= start)
}

/* ─── Conversión de monedas ─── */

/** Precio en Bs. de 1 unidad de la moneda dada (VES = 1). */
export function bsPerUnit(currency: CurrencyId, rates: Rates, statsRateSource: RateId): number {
  if (currency === 'VES') return 1
  if (currency === 'EUR') return rateNum(rates.bcvEur)
  // USD: usa la fuente de tasa elegida (bcvUsd o binanceUsdAvg)
  return rateNum(rates[statsRateSource])
}

/** Normaliza un monto de `fromCur` a `toCur` pivotando por VES. 0 si falta tasa. */
export function normalize(
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

/* ─── Feed de movimientos ─── */

export type FeedItem =
  | { kind: 'tx'; id: string; date: string; tx: Transaction }
  | { kind: 'transfer'; id: string; date: string; transfer: Transfer }
  | { kind: 'budgetTransfer'; id: string; date: string; budgetTransfer: BudgetTransfer }

/** Resumen de cuentas del tab Resumen: cuentas + balance + totales por moneda. */
export interface AccountsSummary {
  accounts: Account[]
  balances: AccountBalance[]
  totalsByCurrency: Record<CurrencyId, number>
}

/** Resultado paginado de movimientos (feed = transacciones + traspasos). */
export interface MovementsPage {
  items: FeedItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Combina transacciones, traspasos y traspasos de presupuesto en un feed único, ordenado por fecha desc. */
export function buildFeed(
  transactions: Transaction[],
  transfers: Transfer[],
  budgetTransfers: BudgetTransfer[] = []
): FeedItem[] {
  const items: FeedItem[] = [
    ...transactions.map((tx) => ({ kind: 'tx' as const, id: tx.id, date: tx.date, tx })),
    ...transfers.map((transfer) => ({
      kind: 'transfer' as const,
      id: transfer.id,
      date: transfer.date,
      transfer,
    })),
    ...budgetTransfers.map((budgetTransfer) => ({
      kind: 'budgetTransfer' as const,
      id: budgetTransfer.id,
      date: budgetTransfer.date,
      budgetTransfer,
    })),
  ]
  const time = (s?: string) => (s ? new Date(s).getTime() : 0)
  const createdAt = (item: FeedItem) =>
    item.kind === 'tx'
      ? item.tx.createdAt
      : item.kind === 'transfer'
        ? item.transfer.createdAt
        : item.budgetTransfer.createdAt
  return items.sort(
    (a, b) => time(b.date) - time(a.date) || time(createdAt(b)) - time(createdAt(a))
  )
}

/* ─── Balances ─── */

/** Datos mínimos para computar balances de cuentas. */
export interface BalanceInput {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
  goalContributions: GoalContribution[]
}

/** Saldo de cada cuenta = apertura + ingresos − gastos ± traspasos − aportes a metas. */
export function computeAccountBalances({
  accounts,
  transactions,
  transfers,
  goalContributions,
}: BalanceInput): AccountBalance[] {
  return accounts.map((account) => {
    let balance = parseAmount(account.openingBalance)
    for (const tx of transactions) {
      if (tx.accountId !== account.id) continue
      const amt = parseAmount(tx.amount)
      balance += tx.type === 'income' ? amt : -amt
      balance -= resolveCommission(amt, tx.commission, tx.commissionType)
    }
    for (const tr of transfers) {
      if (tr.fromAccountId === account.id) {
        balance -= parseAmount(tr.fromAmount)
        balance -= resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
      }
      if (tr.toAccountId === account.id) balance += parseAmount(tr.toAmount)
    }
    for (const gc of goalContributions) {
      if (gc.accountId === account.id) balance -= parseSigned(gc.amount)
    }
    return { accountId: account.id, currency: account.currency, balance }
  })
}

/** Totales por moneda a partir de los balances de cuenta. */
export function computeTotalsByCurrency(balances: AccountBalance[]): Record<CurrencyId, number> {
  const totals: Record<CurrencyId, number> = { VES: 0, USD: 0, EUR: 0 }
  for (const b of balances) totals[b.currency] += b.balance
  return totals
}

/* ─── Estadísticas ─── */

/** Preferencias que afectan la normalización de las estadísticas. */
export interface StatsPrefs {
  displayCurrency: CurrencyId
  statsRateSource: RateId
  timeRange: TimeRange
}

/** Datos necesarios para computar el bundle de estadísticas. */
export interface StatsInput {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
  categories: Category[]
  budgets: Budget[]
  budgetTransfers: BudgetTransfer[]
}

/** Estado de presupuestos de un mes (requiere tasas), ordenado por título. */
export function budgetStatusForMonth(
  input: Pick<StatsInput, 'accounts' | 'categories' | 'budgets' | 'transactions' | 'budgetTransfers'>,
  rates: Rates,
  statsRateSource: RateId,
  month: string
): BudgetStatusRow[] {
  const accountById = new Map(input.accounts.map((a) => [a.id, a]))
  const categoryById = new Map(input.categories.map((c) => [c.id, c]))
  return input.budgets
    .filter((b) => b.month === month)
    .map((budget) => {
      const cat = categoryById.get(budget.categoryId)
      let actual = 0
      for (const tx of input.transactions) {
        if (tx.type !== 'expense' || tx.categoryId !== budget.categoryId) continue
        if (monthKey(tx.date) !== month) continue
        const acct = accountById.get(tx.accountId)
        if (!acct) continue
        actual += normalize(parseAmount(tx.amount), acct.currency, budget.currency, rates, statsRateSource)
      }
      for (const bt of input.budgetTransfers) {
        if (bt.toTemplateId !== budget.templateId || bt.toCategoryId !== budget.categoryId) continue
        if (bt.month !== month) continue
        actual += normalize(parseAmount(bt.spent), bt.currency, budget.currency, rates, statsRateSource)
      }
      const limit = parseAmount(budget.limit)
      const carryover = parseSigned(budget.carryover)
      const effectiveLimit = limit + carryover
      const ratio = effectiveLimit > 0 ? actual / effectiveLimit : actual > 0 ? Infinity : 0
      return {
        budget,
        categoryName: cat?.name ?? 'Desconocida',
        categoryIcon: cat?.icon ?? 'other',
        categoryColor: cat?.color,
        actual,
        limit,
        carryover,
        effectiveLimit,
        ratio,
        isOver: effectiveLimit > 0 && actual > effectiveLimit,
      }
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'es', { sensitivity: 'base' }))
}

/** Computa el bundle completo de estadísticas para el rango dado. */
export function computeStats(input: StatsInput, rates: Rates, prefs: StatsPrefs): StatsBundle {
  const { displayCurrency, statsRateSource, timeRange } = prefs
  const accountById = new Map(input.accounts.map((a) => [a.id, a]))
  const categoryById = new Map(input.categories.map((c) => [c.id, c]))
  const txs = filterByRange(input.transactions, timeRange)

  const norm = (amount: number, fromCur: CurrencyId, toCur: CurrencyId) =>
    normalize(amount, fromCur, toCur, rates, statsRateSource)

  const incomeVsExpense = { income: 0, expense: 0 }
  const byCat = new Map<string, number>()
  const byMonth = new Map<string, { income: number; expense: number }>()

  const addExpenseCommission = (normCommission: number, mk: string) => {
    if (normCommission <= 0) return
    incomeVsExpense.expense += normCommission
    byCat.set(COMMISSION_CATEGORY_ID, (byCat.get(COMMISSION_CATEGORY_ID) ?? 0) + normCommission)
    const bucket = byMonth.get(mk) ?? { income: 0, expense: 0 }
    bucket.expense += normCommission
    byMonth.set(mk, bucket)
  }

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
    const commission = resolveCommission(parseAmount(tx.amount), tx.commission, tx.commissionType)
    addExpenseCommission(norm(commission, acct.currency, displayCurrency), mk)
  }

  const transferStart = timeRange === 'all' ? null : rangeStart(timeRange)
  for (const tr of input.transfers) {
    if (transferStart && new Date(tr.date) < transferStart) continue
    const fromAcct = accountById.get(tr.fromAccountId)
    if (!fromAcct) continue
    const commission = resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
    addExpenseCommission(norm(commission, fromAcct.currency, displayCurrency), monthKey(tr.date))
  }

  const categorySummary: CategorySummaryRow[] = [...byCat.entries()]
    .map(([categoryId, total]) => {
      if (categoryId === COMMISSION_CATEGORY_ID) {
        return {
          categoryId,
          name: 'Comisiones',
          icon: 'other',
          color: undefined,
          kind: 'expense' as const,
          total,
        }
      }
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

  // Patrimonio neto actual (todas las cuentas, normalizado).
  let netWorth = 0
  for (const account of input.accounts) {
    let balance = parseAmount(account.openingBalance)
    for (const tx of input.transactions) {
      if (tx.accountId !== account.id) continue
      const amt = parseAmount(tx.amount)
      balance += tx.type === 'income' ? amt : -amt
      balance -= resolveCommission(amt, tx.commission, tx.commissionType)
    }
    for (const tr of input.transfers) {
      if (tr.fromAccountId === account.id) {
        balance -= parseAmount(tr.fromAmount)
        balance -= resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
      }
      if (tr.toAccountId === account.id) balance += parseAmount(tr.toAmount)
    }
    netWorth += norm(balance, account.currency, displayCurrency)
  }

  // Serie de patrimonio neto acumulado por mes.
  const now = new Date()
  const currentMonthKey = monthKey(now)
  const allDates = [
    ...input.transactions.map((t) => t.date),
    ...input.transfers.map((t) => t.date),
  ]
  const startMonthKey =
    timeRange === 'all'
      ? allDates.length > 0
        ? monthKey(allDates.reduce((a, b) => (a < b ? a : b)))
        : currentMonthKey
      : monthKey(rangeStart(timeRange, now))
  const netWorthSeries: NetWorthPoint[] = enumerateMonths(startMonthKey, currentMonthKey).map((m) => {
    let total = 0
    for (const account of input.accounts) {
      let bal = parseAmount(account.openingBalance)
      for (const tx of input.transactions) {
        if (tx.accountId !== account.id || monthKey(tx.date) > m) continue
        const amt = parseAmount(tx.amount)
        bal += tx.type === 'income' ? amt : -amt
        bal -= resolveCommission(amt, tx.commission, tx.commissionType)
      }
      for (const tr of input.transfers) {
        if (monthKey(tr.date) > m) continue
        if (tr.fromAccountId === account.id) {
          bal -= parseAmount(tr.fromAmount)
          bal -= resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
        }
        if (tr.toAccountId === account.id) bal += parseAmount(tr.toAmount)
      }
      total += norm(bal, account.currency, displayCurrency)
    }
    return { month: m, label: formatMonthLabel(m), value: total }
  })

  const budgetStatus = budgetStatusForMonth(input, rates, statsRateSource, currentMonthKey)

  const usedCurrencies = new Set<CurrencyId>([displayCurrency])
  input.accounts.forEach((a) => usedCurrencies.add(a.currency))
  input.budgets.forEach((b) => usedCurrencies.add(b.currency))
  const ratesAvailable = [...usedCurrencies].every((c) => bsPerUnit(c, rates, statsRateSource) > 0)

  return {
    incomeVsExpense,
    categorySummary,
    monthlySeries,
    netWorth,
    netWorthSeries,
    budgetStatus,
    ratesAvailable,
  }
}
