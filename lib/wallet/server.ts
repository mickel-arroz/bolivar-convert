/**
 * Acceso a datos de la billetera en Supabase — SOLO servidor.
 *
 * Lo usan los route handlers `/api/wallet/*`. El cliente nunca importa este módulo:
 * llega vía fetch a esos endpoints. La sesión (RLS) la aporta el cliente server de
 * Supabase creado desde las cookies de la request.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WalletState,
  Account,
  Category,
  Transaction,
  Transfer,
  Budget,
  BudgetTemplate,
  BudgetTransfer,
  Goal,
  GoalContribution,
  ShoppingList,
  ShoppingListItem,
  ShoppingPurchase,
  TransferRateSource,
  CommissionType,
} from '@/hooks/useWallet'
import type { CurrencyId } from '@/constants/currencies'
import type { Rates, RateId } from '@/constants/rates'
import type { WalletDelta } from '@/lib/wallet/delta'
import type { StatsBundle, TimeRange } from '@/hooks/useWallet'
import {
  buildFeed,
  computeAccountBalances,
  computeTotalsByCurrency,
  computeStats,
  DEFAULT_BUDGET_TEMPLATE_ID,
  type AccountsSummary,
  type MovementsPage,
} from '@/lib/wallet/compute'

/* ───────────────────────── Mapeo dominio ↔ fila ───────────────────────── */

const nn = <T>(v: T | undefined): T | null => (v === undefined ? null : v)
const un = <T>(v: T | null): T | undefined => (v === null ? undefined : v)

function accountToRow(a: Account, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    currency: a.currency,
    opening_balance: a.openingBalance,
    icon: a.icon,
    color: nn(a.color),
    commission: nn(a.commission),
    commission_type: nn(a.commissionType),
    created_at: a.createdAt,
  }
}
function rowToAccount(r: Record<string, unknown>): Account {
  return {
    id: r.id as string,
    name: r.name as string,
    currency: r.currency as CurrencyId,
    openingBalance: r.opening_balance as string,
    icon: r.icon as string,
    color: un(r.color as string | null),
    commission: un(r.commission as string | null),
    commissionType: un(r.commission_type as CommissionType | null),
    createdAt: r.created_at as string,
  }
}

function categoryToRow(c: Category, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    kind: c.kind,
    icon: c.icon,
    color: nn(c.color),
    is_default: c.isDefault ?? false,
  }
}
function rowToCategory(r: Record<string, unknown>): Category {
  return {
    id: r.id as string,
    name: r.name as string,
    kind: r.kind as Category['kind'],
    icon: r.icon as string,
    color: un(r.color as string | null),
    isDefault: (r.is_default as boolean) || undefined,
  }
}

function transactionToRow(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    account_id: t.accountId,
    category_id: t.categoryId,
    amount: t.amount,
    commission: nn(t.commission),
    commission_type: nn(t.commissionType),
    note: nn(t.note),
    date: t.date,
    created_at: t.createdAt,
  }
}
function rowToTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as string,
    type: r.type as Transaction['type'],
    accountId: r.account_id as string,
    categoryId: r.category_id as string,
    amount: r.amount as string,
    commission: un(r.commission as string | null),
    commissionType: un(r.commission_type as CommissionType | null),
    note: un(r.note as string | null),
    date: r.date as string,
    createdAt: r.created_at as string,
  }
}

function transferToRow(t: Transfer, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    from_account_id: t.fromAccountId,
    to_account_id: t.toAccountId,
    from_amount: t.fromAmount,
    to_amount: t.toAmount,
    rate_source: nn(t.rate?.source),
    rate_value: nn(t.rate?.value),
    commission: nn(t.commission),
    commission_type: nn(t.commissionType),
    note: nn(t.note),
    date: t.date,
    created_at: t.createdAt,
  }
}
function rowToTransfer(r: Record<string, unknown>): Transfer {
  const source = r.rate_source as string | null
  return {
    id: r.id as string,
    fromAccountId: r.from_account_id as string,
    toAccountId: r.to_account_id as string,
    fromAmount: r.from_amount as string,
    toAmount: r.to_amount as string,
    rate:
      source !== null
        ? { source: source as TransferRateSource, value: r.rate_value as string }
        : undefined,
    commission: un(r.commission as string | null),
    commissionType: un(r.commission_type as CommissionType | null),
    note: un(r.note as string | null),
    date: r.date as string,
    createdAt: r.created_at as string,
  }
}

function budgetToRow(b: Budget, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    template_id: b.templateId,
    category_id: b.categoryId,
    month: b.month,
    limit: b.limit,
    currency: b.currency,
    carryover: nn(b.carryover),
  }
}
function rowToBudget(r: Record<string, unknown>): Budget {
  return {
    id: r.id as string,
    templateId: (r.template_id as string | null) ?? DEFAULT_BUDGET_TEMPLATE_ID,
    categoryId: r.category_id as string,
    month: r.month as string,
    limit: r.limit as string,
    currency: r.currency as CurrencyId,
    carryover: un(r.carryover as string | null),
  }
}

function budgetTemplateToRow(t: BudgetTemplate, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    description: nn(t.description),
    icon: nn(t.icon),
    color: nn(t.color),
    is_default: t.isDefault ?? false,
    created_at: t.createdAt,
  }
}
function rowToBudgetTemplate(r: Record<string, unknown>): BudgetTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    description: un(r.description as string | null),
    icon: un(r.icon as string | null),
    color: un(r.color as string | null),
    isDefault: (r.is_default as boolean) || undefined,
    createdAt: r.created_at as string,
  }
}

function budgetTransferToRow(t: BudgetTransfer, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    month: t.month,
    from_template_id: t.fromTemplateId,
    from_category_id: t.fromCategoryId,
    to_template_id: t.toTemplateId,
    to_category_id: t.toCategoryId,
    extra: t.extra,
    spent: t.spent,
    currency: t.currency,
    date: t.date,
    created_at: t.createdAt,
  }
}
function rowToBudgetTransfer(r: Record<string, unknown>): BudgetTransfer {
  return {
    id: r.id as string,
    month: r.month as string,
    fromTemplateId: r.from_template_id as string,
    fromCategoryId: r.from_category_id as string,
    toTemplateId: r.to_template_id as string,
    toCategoryId: r.to_category_id as string,
    extra: r.extra as string,
    spent: r.spent as string,
    currency: r.currency as CurrencyId,
    date: r.date as string,
    createdAt: r.created_at as string,
  }
}

function goalToRow(g: Goal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    currency: g.currency,
    target: nn(g.target),
    icon: nn(g.icon),
    color: nn(g.color),
    created_at: g.createdAt,
  }
}
function rowToGoal(r: Record<string, unknown>): Goal {
  return {
    id: r.id as string,
    name: r.name as string,
    currency: r.currency as CurrencyId,
    target: un(r.target as string | null),
    icon: un(r.icon as string | null),
    color: un(r.color as string | null),
    createdAt: r.created_at as string,
  }
}

function contributionToRow(c: GoalContribution, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    goal_id: c.goalId,
    account_id: nn(c.accountId),
    amount: c.amount,
    note: nn(c.note),
    date: c.date,
    created_at: c.createdAt,
  }
}
function rowToContribution(r: Record<string, unknown>): GoalContribution {
  return {
    id: r.id as string,
    goalId: r.goal_id as string,
    accountId: un(r.account_id as string | null),
    amount: r.amount as string,
    note: un(r.note as string | null),
    date: r.date as string,
    createdAt: r.created_at as string,
  }
}

function shoppingListToRow(l: ShoppingList, userId: string) {
  return {
    id: l.id,
    user_id: userId,
    name: l.name,
    icon: nn(l.icon),
    color: nn(l.color),
    created_at: l.createdAt,
  }
}
function rowToShoppingList(r: Record<string, unknown>): ShoppingList {
  return {
    id: r.id as string,
    name: r.name as string,
    icon: un(r.icon as string | null),
    color: un(r.color as string | null),
    createdAt: r.created_at as string,
  }
}

function shoppingItemToRow(it: ShoppingListItem, userId: string) {
  return {
    id: it.id,
    user_id: userId,
    list_id: it.listId,
    title: it.title,
    description: nn(it.description),
    price: it.price,
    currency: it.currency,
    purchased: it.purchased,
    purchase: nn(it.purchase),
    created_at: it.createdAt,
  }
}
function rowToShoppingItem(r: Record<string, unknown>): ShoppingListItem {
  return {
    id: r.id as string,
    listId: r.list_id as string,
    title: r.title as string,
    description: un(r.description as string | null),
    price: r.price as string,
    currency: r.currency as CurrencyId,
    purchased: (r.purchased as boolean) ?? false,
    purchase: un(r.purchase as ShoppingPurchase | null),
    createdAt: r.created_at as string,
  }
}

/* ───────────────────────────── Carga ───────────────────────────── */

/** Lee todas las tablas del usuario y arma un `WalletState` parcial. Lanza si falla. */
export async function loadWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<WalletState>> {
  const [
    profile,
    accounts,
    categories,
    transactions,
    transfers,
    budgets,
    budgetTemplates,
    budgetTransfers,
    goals,
    contributions,
    shoppingLists,
    shoppingItems,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('transfers').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('budget_templates').select('*').eq('user_id', userId),
    supabase.from('budget_transfers').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('goal_contributions').select('*').eq('user_id', userId),
    supabase.from('shopping_lists').select('*').eq('user_id', userId),
    supabase.from('shopping_list_items').select('*').eq('user_id', userId),
  ])

  const failed = [
    profile,
    accounts,
    categories,
    transactions,
    transfers,
    budgets,
    budgetTemplates,
    budgetTransfers,
    goals,
    contributions,
    shoppingLists,
    shoppingItems,
  ].find((r) => r.error)
  if (failed?.error) throw failed.error

  const rows = <T>(res: { data: unknown }, map: (r: Record<string, unknown>) => T): T[] =>
    ((res.data as Record<string, unknown>[]) ?? []).map(map)

  const state: Partial<WalletState> = {
    accounts: rows(accounts, rowToAccount),
    categories: rows(categories, rowToCategory),
    transactions: rows(transactions, rowToTransaction),
    transfers: rows(transfers, rowToTransfer),
    budgets: rows(budgets, rowToBudget),
    budgetTemplates: rows(budgetTemplates, rowToBudgetTemplate),
    budgetTransfers: rows(budgetTransfers, rowToBudgetTransfer),
    goals: rows(goals, rowToGoal),
    goalContributions: rows(contributions, rowToContribution),
    shoppingLists: rows(shoppingLists, rowToShoppingList),
    shoppingItems: rows(shoppingItems, rowToShoppingItem),
  }

  const p = profile.data as Record<string, unknown> | null
  if (p) {
    state.displayCurrency = p.display_currency as CurrencyId
    state.statsRateSource = p.stats_rate_source as RateId
    state.timeRange = p.time_range as WalletState['timeRange']
    state.concludedMonths = (p.concluded_months as string[]) ?? []
    state.activeBudgetTemplateId =
      (p.active_budget_template_id as string | null) ?? DEFAULT_BUDGET_TEMPLATE_ID
  }

  return state
}

/* ─────────────────────────── Validación ─────────────────────────── */

/** Error de negocio: título de presupuesto duplicado en un mes. */
export class BudgetTitleConflictError extends Error {
  constructor(message = 'Ya existe un presupuesto con ese título este mes.') {
    super(message)
    this.name = 'BudgetTitleConflictError'
  }
}

/** Error de negocio: nombre de categoría duplicado (dentro del mismo tipo). */
export class CategoryNameConflictError extends Error {
  constructor(message = 'Ya existe una categoría con ese nombre.') {
    super(message)
    this.name = 'CategoryNameConflictError'
  }
}

const normalizeTitle = (s: string | undefined | null) => (s ?? '').trim().toLowerCase()

/**
 * Valida que, tras aplicar el delta, no queden dos categorías con el mismo nombre
 * dentro del mismo tipo (gasto/ingreso). Lanza {@link CategoryNameConflictError}.
 */
export async function assertNoDuplicateCategoryNames(
  supabase: SupabaseClient,
  userId: string,
  delta: WalletDelta
): Promise<void> {
  if (delta.upserts.categories.length === 0) return

  const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId)
  if (error) throw error

  // Estado efectivo: DB, quitando borradas y reemplazando por upserts del delta.
  const byId = new Map<string, Category>()
  for (const r of (data as Record<string, unknown>[]) ?? []) {
    const c = rowToCategory(r)
    byId.set(c.id, c)
  }
  for (const id of delta.deletes.categories) byId.delete(id)
  for (const c of delta.upserts.categories) byId.set(c.id, c)

  const seen = new Set<string>() // `${kind}:${nombre-normalizado}`
  for (const c of byId.values()) {
    const key = `${c.kind}:${normalizeTitle(c.name)}`
    if (seen.has(key)) throw new CategoryNameConflictError()
    seen.add(key)
  }
}

/**
 * Valida que, tras aplicar el delta, no queden dos presupuestos en el mismo mes
 * cuyo título (nombre de categoría) coincida. Reconstruye el estado efectivo de
 * `budgets` y `categories` combinando lo que hay en Supabase con el delta.
 * Lanza {@link BudgetTitleConflictError} si detecta colisión.
 */
export async function assertNoDuplicateBudgetTitles(
  supabase: SupabaseClient,
  userId: string,
  delta: WalletDelta
): Promise<void> {
  // Solo hace falta validar si el delta toca presupuestos o nombres de categoría.
  if (delta.upserts.budgets.length === 0 && delta.upserts.categories.length === 0) return

  const [budgetsRes, categoriesRes] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
  ])
  if (budgetsRes.error) throw budgetsRes.error
  if (categoriesRes.error) throw categoriesRes.error

  // Nombre efectivo por categoría: DB + upserts del delta (los upserts ganan).
  const nameByCat = new Map<string, string>()
  for (const r of (categoriesRes.data as Record<string, unknown>[]) ?? []) {
    nameByCat.set(r.id as string, r.name as string)
  }
  for (const c of delta.upserts.categories) nameByCat.set(c.id, c.name)
  const deletedCats = new Set(delta.deletes.categories)

  // Presupuestos efectivos: DB, quitando borrados y reemplazando por upserts.
  const budgetsById = new Map<string, Budget>()
  for (const r of (budgetsRes.data as Record<string, unknown>[]) ?? []) {
    const b = rowToBudget(r)
    budgetsById.set(b.id, b)
  }
  for (const id of delta.deletes.budgets) budgetsById.delete(id)
  for (const b of delta.upserts.budgets) budgetsById.set(b.id, b)

  // Dentro de cada (plantilla, mes), ningún título repetido entre categorías distintas.
  const seen = new Map<string, Map<string, string>>() // `${templateId}:${month}` → (title → categoryId)
  for (const b of budgetsById.values()) {
    if (deletedCats.has(b.categoryId)) continue
    const title = normalizeTitle(nameByCat.get(b.categoryId))
    if (!title) continue
    const scope = `${b.templateId}:${b.month}`
    const scopeMap = seen.get(scope) ?? new Map<string, string>()
    const owner = scopeMap.get(title)
    if (owner && owner !== b.categoryId) {
      throw new BudgetTitleConflictError()
    }
    scopeMap.set(title, b.categoryId)
    seen.set(scope, scopeMap)
  }
}

/* ─────────────────────────── Aplicar delta ─────────────────────────── */

/**
 * Aplica el delta recibido del cliente. Orden FK-seguro: upsert de padres → upsert
 * de hijos → delete de hijos → delete de padres. Upserts/deletes idempotentes.
 */
export async function applyWalletDelta(
  supabase: SupabaseClient,
  userId: string,
  delta: WalletDelta
): Promise<void> {
  const errors: unknown[] = []
  const check = (res: { error: unknown }) => {
    if (res.error) errors.push(res.error)
  }

  const upsert = async (table: string, rows: unknown[]) => {
    if (rows.length === 0) return
    check(await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' }))
  }
  const del = async (table: string, ids: string[]) => {
    if (ids.length === 0) return
    check(await supabase.from(table).delete().eq('user_id', userId).in('id', ids))
  }

  const { upserts, deletes } = delta

  // 1) Upsert de padres
  await Promise.all([
    upsert('accounts', upserts.accounts.map((a) => accountToRow(a, userId))),
    upsert('categories', upserts.categories.map((c) => categoryToRow(c, userId))),
    upsert('budget_templates', upserts.budgetTemplates.map((t) => budgetTemplateToRow(t, userId))),
    upsert('goals', upserts.goals.map((g) => goalToRow(g, userId))),
    upsert('shopping_lists', upserts.shoppingLists.map((l) => shoppingListToRow(l, userId))),
  ])

  // 2) Upsert de hijos
  await Promise.all([
    upsert('transactions', upserts.transactions.map((t) => transactionToRow(t, userId))),
    upsert('transfers', upserts.transfers.map((t) => transferToRow(t, userId))),
    upsert('budgets', upserts.budgets.map((b) => budgetToRow(b, userId))),
    upsert('budget_transfers', (upserts.budgetTransfers ?? []).map((t) => budgetTransferToRow(t, userId))),
    upsert('goal_contributions', upserts.goalContributions.map((c) => contributionToRow(c, userId))),
    upsert('shopping_list_items', upserts.shoppingItems.map((it) => shoppingItemToRow(it, userId))),
  ])

  // 3) Delete de hijos primero
  await Promise.all([
    del('transactions', deletes.transactions),
    del('transfers', deletes.transfers),
    del('budgets', deletes.budgets),
    del('budget_transfers', deletes.budgetTransfers ?? []),
    del('goal_contributions', deletes.goalContributions),
    del('shopping_list_items', deletes.shoppingItems),
  ])

  // 4) Delete de padres al final
  await Promise.all([
    del('accounts', deletes.accounts),
    del('categories', deletes.categories),
    del('budget_templates', deletes.budgetTemplates),
    del('goals', deletes.goals),
    del('shopping_lists', deletes.shoppingLists),
  ])

  // 5) Preferencias
  if (delta.prefs) {
    check(
      await supabase.from('profiles').upsert(
        {
          id: userId,
          display_currency: delta.prefs.displayCurrency,
          stats_rate_source: delta.prefs.statsRateSource,
          time_range: delta.prefs.timeRange,
          concluded_months: delta.prefs.concludedMonths,
          active_budget_template_id: delta.prefs.activeBudgetTemplateId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    )
  }

  if (errors.length > 0) throw errors[0]
}

/* ─────────────────── Lecturas por tab (endpoints dedicados) ─────────────────── */

/** Carga cuentas con su balance calculado (incluye traspasos y aportes a metas). */
export async function loadAccountsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountsSummary> {
  const [accountsRes, txRes, trRes, gcRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('transfers').select('*').eq('user_id', userId),
    supabase.from('goal_contributions').select('*').eq('user_id', userId),
  ])
  const failed = [accountsRes, txRes, trRes, gcRes].find((r) => r.error)
  if (failed?.error) throw failed.error

  const accounts = ((accountsRes.data as Record<string, unknown>[]) ?? []).map(rowToAccount)
  const transactions = ((txRes.data as Record<string, unknown>[]) ?? []).map(rowToTransaction)
  const transfers = ((trRes.data as Record<string, unknown>[]) ?? []).map(rowToTransfer)
  const goalContributions = ((gcRes.data as Record<string, unknown>[]) ?? []).map(rowToContribution)

  const balances = computeAccountBalances({ accounts, transactions, transfers, goalContributions })
  return { accounts, balances, totalsByCurrency: computeTotalsByCurrency(balances) }
}

/**
 * Feed de movimientos ordenado por fecha desc. Si `pageSize`/`page` se indican,
 * devuelve una página; si `limit` se indica, devuelve solo los N más recientes.
 * La combinación tx+traspasos se hace en el handler (escala de finanzas personales).
 */
export async function loadMovements(
  supabase: SupabaseClient,
  userId: string,
  opts: { page?: number; pageSize?: number; limit?: number }
): Promise<MovementsPage> {
  const [txRes, trRes, btRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('transfers').select('*').eq('user_id', userId),
    supabase.from('budget_transfers').select('*').eq('user_id', userId),
  ])
  const failed = [txRes, trRes, btRes].find((r) => r.error)
  if (failed?.error) throw failed.error

  const transactions = ((txRes.data as Record<string, unknown>[]) ?? []).map(rowToTransaction)
  const transfers = ((trRes.data as Record<string, unknown>[]) ?? []).map(rowToTransfer)
  const budgetTransfers = ((btRes.data as Record<string, unknown>[]) ?? []).map(rowToBudgetTransfer)
  const feed = buildFeed(transactions, transfers, budgetTransfers)
  const total = feed.length

  if (opts.limit !== undefined) {
    const items = feed.slice(0, opts.limit)
    return { items, page: 1, pageSize: opts.limit, total, totalPages: 1 }
  }

  const pageSize = opts.pageSize ?? 30
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, opts.page ?? 1), totalPages)
  const start = (page - 1) * pageSize
  const items = feed.slice(start, start + pageSize)
  return { items, page, pageSize, total, totalPages }
}

/**
 * Estadísticas computadas en el servidor para un rango de antigüedad. Toma la
 * moneda de visualización y la fuente de tasa de las preferencias del usuario y
 * las tasas actuales (pasadas por el handler).
 */
export async function loadStats(
  supabase: SupabaseClient,
  userId: string,
  range: TimeRange,
  rates: Rates
): Promise<StatsBundle> {
  const [profileRes, accountsRes, txRes, trRes, catRes, budgetRes, btRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('transfers').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('budget_transfers').select('*').eq('user_id', userId),
  ])
  const failed = [profileRes, accountsRes, txRes, trRes, catRes, budgetRes, btRes].find(
    (r) => r.error
  )
  if (failed?.error) throw failed.error

  const accounts = ((accountsRes.data as Record<string, unknown>[]) ?? []).map(rowToAccount)
  const transactions = ((txRes.data as Record<string, unknown>[]) ?? []).map(rowToTransaction)
  const transfers = ((trRes.data as Record<string, unknown>[]) ?? []).map(rowToTransfer)
  const categories = ((catRes.data as Record<string, unknown>[]) ?? []).map(rowToCategory)
  const allBudgets = ((budgetRes.data as Record<string, unknown>[]) ?? []).map(rowToBudget)
  const budgetTransfers = ((btRes.data as Record<string, unknown>[]) ?? []).map(rowToBudgetTransfer)

  const p = profileRes.data as Record<string, unknown> | null
  const displayCurrency = (p?.display_currency as CurrencyId) ?? 'VES'
  const statsRateSource = (p?.stats_rate_source as RateId) ?? 'bcvUsd'
  const activeTemplateId =
    (p?.active_budget_template_id as string | null) ?? DEFAULT_BUDGET_TEMPLATE_ID
  const budgets = allBudgets.filter((b) => b.templateId === activeTemplateId)

  return computeStats(
    { accounts, transactions, transfers, categories, budgets, budgetTransfers },
    rates,
    { displayCurrency, statsRateSource, timeRange: range }
  )
}
