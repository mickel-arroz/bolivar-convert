/**
 * Cálculos puros de la billetera (balances, normalización de monedas y estadísticas).
 *
 * Módulo neutro (sin React ni acceso a red): lo usan tanto el cliente (`useWallet`)
 * como los route handlers `/api/wallet/*`, para tener una única fuente de verdad y
 * que el cálculo del navegador y el del servidor nunca diverjan.
 */
import type { CurrencyId } from '@/constants/currencies'
import type { Rates, RateId } from '@/constants/rates'
import type { GoalMovement } from './goalMovements'
import { enumeratePeriods, periodKey, periodLabel, seriesGrouping } from './periods'
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
  AccountFunds,
  StatsBundle,
  CategorySummaryRow,
  PeriodPoint,
  NetWorthPoint,
  BudgetStatusRow,
} from '@/hooks/useWallet'

/** Margen para comparaciones de saldo (evita rechazos por error de coma flotante). */
export const OVERDRAW_EPS = 1e-6

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

/** Clave 'YYYY-MM' del mes anterior. */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, (m || 1) - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
  | { kind: 'goalMovement'; id: string; date: string; movement: GoalMovement }

/** Resumen de cuentas del tab Resumen: cuentas + sus tres cifras + totales por moneda. */
export interface AccountsSummary {
  accounts: Account[]
  funds: AccountFunds[]
  totalsByCurrency: Record<CurrencyId, number>
  /** Lo que está En planes, por moneda: la línea que explica el Patrimonio neto. */
  inGoalsByCurrency: Record<CurrencyId, number>
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
  budgetTransfers: BudgetTransfer[] = [],
  goalMovements: GoalMovement[] = []
): FeedItem[] {
  // El ingreso que dejó un retiro ya va dentro de ese retiro.
  const shownMovements = new Set(goalMovements.map((m) => m.id))
  const items: FeedItem[] = [
    ...transactions
      .filter((tx) => !tx.goalMovementId || !shownMovements.has(tx.goalMovementId))
      .map((tx) => ({ kind: 'tx' as const, id: tx.id, date: tx.date, tx })),
    ...goalMovements.map((movement) => ({
      kind: 'goalMovement' as const,
      id: movement.id,
      date: movement.date,
      movement,
    })),
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
        : item.kind === 'goalMovement'
          ? item.movement.createdAt
          : item.budgetTransfer.createdAt
  return items.sort(
    (a, b) => time(b.date) - time(a.date) || time(createdAt(b)) - time(createdAt(a))
  )
}

/* ─── Balances ─── */

/** Datos mínimos para computar el Saldo de la cuenta. */
export interface BalanceInput {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
}

/** Lo que además hace falta para repartir el saldo entre Disponible y En planes. */
export interface FundsInput extends BalanceInput {
  goalContributions: GoalContribution[]
  /** Para descartar los aportes de un plan completado: ese dinero ya se gastó. */
  goals?: readonly { id: string; completedAt?: string }[]
}

/**
 * **Saldo de la cuenta** = apertura + ingresos − gastos ± traspasos.
 *
 * Los planes de ahorro NO entran: aportar a un plan no mueve dinero del banco
 * (ADR 0002). Para repartir este saldo entre Disponible y En planes, ver
 * {@link computeAccountFunds}.
 */
function computeAccountBalances({
  accounts,
  transactions,
  transfers,
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
    return { accountId: account.id, currency: account.currency, balance }
  })
}

/**
 * Las tres cifras de cada cuenta: **Saldo de la cuenta**, **En planes** y **Disponible**.
 *
 * Reusa {@link computeAccountBalances} para el saldo y solo le resta lo apartado, de
 * modo que Saldo = Disponible + En planes por construcción. Los aportes sin cuenta
 * (los que vienen de mandar el sobrante de un mes a un plan) no se atribuyen a
 * ninguna: la suma de En planes puede quedar por debajo de lo ahorrado en todos los planes.
 */
export function computeAccountFunds({
  goalContributions,
  goals = [],
  ...balanceInput
}: FundsInput): AccountFunds[] {
  const completed = new Set(goals.filter((g) => g.completedAt).map((g) => g.id))
  const inGoalsByAccount = new Map<string, number>()
  for (const gc of goalContributions) {
    if (!gc.accountId || completed.has(gc.goalId)) continue
    inGoalsByAccount.set(gc.accountId, (inGoalsByAccount.get(gc.accountId) ?? 0) + parseSigned(gc.amount))
  }
  return computeAccountBalances(balanceInput).map((b) => {
    const inGoals = inGoalsByAccount.get(b.accountId) ?? 0
    return { ...b, inGoals, available: b.balance - inGoals }
  })
}

/** Totales por moneda a partir del Saldo de la cuenta (los planes cuentan como patrimonio). */
export function computeTotalsByCurrency(balances: AccountBalance[]): Record<CurrencyId, number> {
  const totals: Record<CurrencyId, number> = { VES: 0, USD: 0, EUR: 0 }
  for (const b of balances) totals[b.currency] += b.balance
  return totals
}

/** Totales por moneda de lo que está **En planes**, para explicar el Patrimonio neto. */
export function computeInGoalsByCurrency(funds: AccountFunds[]): Record<CurrencyId, number> {
  const totals: Record<CurrencyId, number> = { VES: 0, USD: 0, EUR: 0 }
  for (const f of funds) totals[f.currency] += f.inGoals
  return totals
}

/** Las dos partes de un Plan de ahorro que se pueden retirar hacia una cuenta. */
export interface PlanWithdrawable {
  /** Lo que esa cuenta aportó al plan y sigue ahí: vuelve a su Disponible. */
  fromAccount: number
  /** Lo que llegó al plan sin cuenta (sobrante de un mes): entra a la cuenta como ingreso. */
  unattributed: number
}

/**
 * Cuánto se puede retirar de un plan hacia `accountId`. Nunca lo que aportó otra
 * cuenta: eso dejaría su En planes negativo y su Disponible por encima de su Saldo.
 */
export function computePlanWithdrawable(
  contributions: readonly GoalContribution[],
  goalId: string,
  accountId: string
): PlanWithdrawable {
  let fromAccount = 0
  let unattributed = 0
  for (const gc of contributions) {
    if (gc.goalId !== goalId) continue
    if (gc.accountId === accountId) fromAccount += parseSigned(gc.amount)
    else if (!gc.accountId) unattributed += parseSigned(gc.amount)
  }
  return { fromAccount: Math.max(0, fromAccount), unattributed: Math.max(0, unattributed) }
}

/** Reparte un retiro: primero lo que aportó la cuenta, después lo sin cuenta. `null` si no alcanza. */
export function splitPlanWithdrawal(withdrawable: PlanWithdrawable, value: number): PlanWithdrawable | null {
  if (value - (withdrawable.fromAccount + withdrawable.unattributed) > OVERDRAW_EPS) return null
  const unattributed = value - withdrawable.fromAccount
  if (unattributed <= OVERDRAW_EPS) return { fromAccount: value, unattributed: 0 }
  return { fromAccount: withdrawable.fromAccount, unattributed }
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

/** Presupuesto sobrepasado: gasto mayor que el límite efectivo; con límite ≤ 0, cualquier gasto. */
export function isBudgetOver(actual: number, effectiveLimit: number): boolean {
  return actual > Math.max(effectiveLimit, 0)
}

/**
 * Estado de presupuestos de un mes (requiere tasas): primero los no sobrepasados y luego los
 * sobrepasados, cada grupo ordenado por título.
 */
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
      // El Déficit arrastrado cuenta como ya utilizado del mes.
      const carriedDeficit = parseAmount(budget.carriedDeficit)
      actual += carriedDeficit
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
        carriedDeficit,
        effectiveLimit,
        ratio,
        isOver: isBudgetOver(actual, effectiveLimit),
      }
    })
    .sort(
      (a, b) =>
        Number(a.isOver) - Number(b.isOver) ||
        a.categoryName.localeCompare(b.categoryName, 'es', { sensitivity: 'base' })
    )
}

/**
 * Meses de presupuesto que cubre un rango de Estadísticas: 1M es el mes actual; 6M y 1A,
 * los meses del rango; Todo, desde el primer mes con presupuesto.
 */
export function budgetRangeMonths(
  range: TimeRange,
  budgets: Pick<Budget, 'month'>[],
  now: Date = new Date()
): string[] {
  const current = monthKey(now)
  if (range === '1m') return [current]
  if (range !== 'all') return enumerateMonths(monthKey(rangeStart(range, now)), current)
  const first = budgets.reduce((min, b) => (b.month < min ? b.month : min), current)
  return enumerateMonths(first, current)
}

/**
 * Presupuesto vs gastado sumando varios meses: una fila por categoría y moneda. Lo que un
 * mes del rango le pasa al siguiente (sobrante o Déficit arrastrado) ya está contado en el
 * mes que lo originó, así que solo cuenta el arrastre del primer mes, que viene de antes.
 * La fila lleva el presupuesto del último mes. Con un solo mes es igual al estado del mes.
 */
export function budgetStatusForRange(
  input: Pick<StatsInput, 'accounts' | 'categories' | 'budgets' | 'transactions' | 'budgetTransfers'>,
  rates: Rates,
  statsRateSource: RateId,
  months: string[]
): BudgetStatusRow[] {
  const byKey = new Map<string, BudgetStatusRow>()
  for (const month of months) {
    for (const row of budgetStatusForMonth(input, rates, statsRateSource, month)) {
      const key = `${row.budget.categoryId}|${row.budget.currency}`
      const acc = byKey.get(key)
      if (!acc) {
        byKey.set(key, { ...row })
        continue
      }
      acc.budget = row.budget
      acc.actual += row.actual - row.carriedDeficit
      acc.limit += row.limit
    }
  }
  return [...byKey.values()]
    .map((row) => {
      const effectiveLimit = row.limit + row.carryover
      const ratio =
        effectiveLimit > 0 ? row.actual / effectiveLimit : row.actual > 0 ? Infinity : 0
      return { ...row, effectiveLimit, ratio, isOver: isBudgetOver(row.actual, effectiveLimit) }
    })
    .sort(
      (a, b) =>
        Number(a.isOver) - Number(b.isOver) ||
        a.categoryName.localeCompare(b.categoryName, 'es', { sensitivity: 'base' })
    )
}

/** Suma de todos los presupuestos de un mes, en una sola moneda. */
export interface BudgetsSummary {
  currency: CurrencyId
  count: number
  /** Σ estimado de los presupuestos. */
  budget: number
  /** Σ extra arrastrado (con signo: un déficit resta). */
  extra: number
  /** Presupuesto + extra: lo disponible en total. */
  total: number
  /** Parte del estimado ya gastada. */
  spentBudget: number
  /** Parte del extra ya gastada (el gasto consume primero el estimado y después el extra). */
  spentExtra: number
  /** Estimado que queda libre. */
  freeBudget: number
  /** Extra que queda libre (negativo mientras haya un déficit arrastrado sin cubrir). */
  extraLeft: number
  /**
   * Gastado por encima de lo disponible de cada presupuesto (estimado + extra), sumado
   * presupuesto a presupuesto. Cierra las cuentas del desglose:
   * `spentBudget + spentExtra + overspent = spent` y
   * `freeBudget + extraLeft − overspent = total − spent`.
   */
  overspent: number
  /**
   * Gastado por encima del total general (presupuesto + extra de todos sumados); 0 si lo
   * gastado cabe en la suma. Un presupuesto que se pasó solo no cuenta si otros tienen
   * holgura para cubrirlo: es la suma lo que se compara.
   */
  overflow: number
  /** Σ gastado real, tal como lo muestra cada tarjeta. */
  spent: number
  /** Parte de `spent` que es Déficit arrastrado del mes anterior, no gasto de este mes. */
  carriedDeficit: number
  /** Parte gastada del total, de 0 a 1. 1 si no hay total y sí gasto. */
  ratio: number
  /** Se convirtieron presupuestos de otra moneda. */
  converted: boolean
  /** Falta una tasa para convertir alguno: esa parte no está sumada. */
  ratesMissing: boolean
}

/**
 * Suma las filas de `budgetStatusForMonth`. Si todos los presupuestos están en una misma
 * moneda se queda en ella (sin depender de tasas); si hay varias, convierte a
 * `displayCurrency` con la fuente de tasa elegida.
 *
 * Reparto del gasto de cada presupuesto: consume primero el estimado y, agotado este, el
 * extra. Un extra negativo (déficit) no se gasta: reduce lo disponible y sigue figurando
 * en `extraLeft`. Lo que un presupuesto gasta por encima de su estimado + extra va a
 * `overspent`, así el desglose siempre cuadra con lo gastado y lo disponible.
 *
 * `overflow` compara la suma de lo gastado contra la suma de lo disponible: un presupuesto
 * que se pasó no cuenta mientras la suma general alcance.
 */
export function summarizeBudgets(
  rows: BudgetStatusRow[],
  displayCurrency: CurrencyId,
  rates: Rates,
  statsRateSource: RateId
): BudgetsSummary {
  const currencies = new Set(rows.map((r) => r.budget.currency))
  const currency = currencies.size === 1 ? [...currencies][0] : displayCurrency

  let ratesMissing = false
  const conv = (value: number, from: CurrencyId) => {
    if (from === currency || value === 0) return value
    const v = normalize(value, from, currency, rates, statsRateSource)
    if (v === 0) ratesMissing = true
    return v
  }

  const s = {
    budget: 0,
    extra: 0,
    spentBudget: 0,
    spentExtra: 0,
    freeBudget: 0,
    extraLeft: 0,
    overspent: 0,
    spent: 0,
    carriedDeficit: 0,
  }
  for (const row of rows) {
    const from = row.budget.currency
    const limit = Math.max(conv(row.limit, from), 0)
    const carry = conv(row.carryover, from)
    const actual = conv(row.actual, from)

    const spentBudget = Math.min(actual, limit)
    const spentExtra = carry > 0 ? Math.min(Math.max(actual - limit, 0), carry) : 0

    s.budget += limit
    s.extra += carry
    s.spentBudget += spentBudget
    s.spentExtra += spentExtra
    s.freeBudget += limit - spentBudget
    s.extraLeft += carry - spentExtra
    s.overspent += actual - spentBudget - spentExtra
    s.spent += actual
    s.carriedDeficit += conv(row.carriedDeficit, from)
  }

  const total = s.budget + s.extra
  return {
    currency,
    count: rows.length,
    ...s,
    total,
    overflow: Math.max(s.spent - Math.max(total, 0), 0),
    ratio: total > 0 ? Math.min(s.spent / total, 1) : s.spent > 0 ? 1 : 0,
    converted: currencies.size > 1,
    ratesMissing,
  }
}

/** Uso del presupuesto total del mes, en la moneda de visualización. */
export interface BudgetUsage {
  currency: CurrencyId
  /** Σ gastado del mes, sin el Déficit arrastrado. */
  spent: number
  /** Σ límite efectivo (estimado + extra). */
  total: number
  /** `spent / total`, sin tope; 0 si no hay total. */
  ratio: number
  onTrack: number
  over: number
}

/** Lo gastado del mes en un presupuesto: el Déficit arrastrado no es gasto de este mes. */
const spentThisMonth = (row: BudgetStatusRow) => row.actual - row.carriedDeficit

const overThisMonth = (row: BudgetStatusRow) => isBudgetOver(spentThisMonth(row), row.effectiveLimit)

export function budgetUsage(
  rows: BudgetStatusRow[],
  displayCurrency: CurrencyId,
  rates: Rates,
  statsRateSource: RateId
): BudgetUsage {
  let spent = 0
  let total = 0
  let over = 0
  for (const row of rows) {
    const from = row.budget.currency
    spent += normalize(spentThisMonth(row), from, displayCurrency, rates, statsRateSource)
    total += normalize(Math.max(row.effectiveLimit, 0), from, displayCurrency, rates, statsRateSource)
    if (overThisMonth(row)) over++
  }
  return {
    currency: displayCurrency,
    spent,
    total,
    ratio: total > 0 ? spent / total : 0,
    onTrack: rows.length - over,
    over,
  }
}

export interface BudgetUsageRow {
  row: BudgetStatusRow
  /** Gastado del mes en la moneda del presupuesto. */
  spent: number
  /** `spent / límite efectivo`; Infinity si hay gasto sin límite. */
  ratio: number
  isOver: boolean
}

/** Presupuestos del más consumido al menos consumido, cada uno en su propia moneda. */
export function rankBudgetsByUsage(rows: BudgetStatusRow[]): BudgetUsageRow[] {
  return rows
    .map((row) => {
      const spent = spentThisMonth(row)
      const ratio = row.effectiveLimit > 0 ? spent / row.effectiveLimit : spent > 0 ? Infinity : 0
      return { row, spent, ratio, isOver: overThisMonth(row) }
    })
    .sort(
      (a, b) =>
        b.ratio - a.ratio ||
        a.row.categoryName.localeCompare(b.row.categoryName, 'es', { sensitivity: 'base' })
    )
}

/** Computa el bundle completo de estadísticas para el rango dado. */
export function computeStats(input: StatsInput, rates: Rates, prefs: StatsPrefs): StatsBundle {
  const { displayCurrency, statsRateSource, timeRange } = prefs
  const accountById = new Map(input.accounts.map((a) => [a.id, a]))
  const categoryById = new Map(input.categories.map((c) => [c.id, c]))
  const txs = filterByRange(input.transactions, timeRange)

  const now = new Date()
  const allDates = [
    ...input.transactions.map((t) => t.date),
    ...input.transfers.map((t) => t.date),
  ]
  const firstDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null
  const grouping = seriesGrouping(timeRange, firstDate, now)
  const keyOf = (date: string | Date) => periodKey(date, grouping)

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
    const mk = keyOf(tx.date)
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
    addExpenseCommission(norm(commission, fromAcct.currency, displayCurrency), keyOf(tr.date))
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

  const startKey =
    timeRange === 'all' ? keyOf(firstDate ?? now) : keyOf(rangeStart(timeRange, now))
  const endKey = [...byMonth.keys(), keyOf(now)].reduce((a, b) => (a > b ? a : b))
  const periods = enumeratePeriods(startKey, endKey, grouping)

  const periodSeries: PeriodPoint[] = periods.map((key) => ({
    period: key,
    label: periodLabel(key, grouping),
    ...(byMonth.get(key) ?? { income: 0, expense: 0 }),
  }))

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

  // Patrimonio neto acumulado al cierre de cada periodo de la serie.
  const currentMonthKey = monthKey(now)
  const netWorthSeries: NetWorthPoint[] = periods.map((m) => {
    let total = 0
    for (const account of input.accounts) {
      let bal = parseAmount(account.openingBalance)
      for (const tx of input.transactions) {
        if (tx.accountId !== account.id || keyOf(tx.date) > m) continue
        const amt = parseAmount(tx.amount)
        bal += tx.type === 'income' ? amt : -amt
        bal -= resolveCommission(amt, tx.commission, tx.commissionType)
      }
      for (const tr of input.transfers) {
        if (keyOf(tr.date) > m) continue
        if (tr.fromAccountId === account.id) {
          bal -= parseAmount(tr.fromAmount)
          bal -= resolveCommission(parseAmount(tr.fromAmount), tr.commission, tr.commissionType)
        }
        if (tr.toAccountId === account.id) bal += parseAmount(tr.toAmount)
      }
      total += norm(bal, account.currency, displayCurrency)
    }
    return { period: m, label: periodLabel(m, grouping), value: total }
  })

  const budgetStatus = budgetStatusForMonth(input, rates, statsRateSource, currentMonthKey)
  const budgetRange = budgetStatusForRange(
    input,
    rates,
    statsRateSource,
    budgetRangeMonths(timeRange, input.budgets, now)
  )

  const usedCurrencies = new Set<CurrencyId>([displayCurrency])
  input.accounts.forEach((a) => usedCurrencies.add(a.currency))
  input.budgets.forEach((b) => usedCurrencies.add(b.currency))
  const ratesAvailable = [...usedCurrencies].every((c) => bsPerUnit(c, rates, statsRateSource) > 0)

  return {
    incomeVsExpense,
    categorySummary,
    periodSeries,
    netWorth,
    netWorthSeries,
    budgetStatus,
    budgetRange,
    budgetUsage: budgetUsage(budgetRange, displayCurrency, rates, statsRateSource),
    grouping,
    ratesAvailable,
  }
}
