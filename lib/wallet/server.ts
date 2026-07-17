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
  Goal,
  GoalContribution,
  TransferRateSource,
} from '@/hooks/useWallet'
import type { CurrencyId } from '@/constants/currencies'
import type { RateId } from '@/constants/rates'
import type { WalletDelta } from '@/lib/wallet/delta'

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
    note: un(r.note as string | null),
    date: r.date as string,
    createdAt: r.created_at as string,
  }
}

function budgetToRow(b: Budget, userId: string) {
  return {
    id: b.id,
    user_id: userId,
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
    categoryId: r.category_id as string,
    month: r.month as string,
    limit: r.limit as string,
    currency: r.currency as CurrencyId,
    carryover: un(r.carryover as string | null),
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

/* ───────────────────────────── Carga ───────────────────────────── */

/** Lee todas las tablas del usuario y arma un `WalletState` parcial. Lanza si falla. */
export async function loadWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<WalletState>> {
  const [profile, accounts, categories, transactions, transfers, budgets, goals, contributions] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('transfers').select('*').eq('user_id', userId),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('goal_contributions').select('*').eq('user_id', userId),
    ])

  const failed = [
    profile,
    accounts,
    categories,
    transactions,
    transfers,
    budgets,
    goals,
    contributions,
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
    goals: rows(goals, rowToGoal),
    goalContributions: rows(contributions, rowToContribution),
  }

  const p = profile.data as Record<string, unknown> | null
  if (p) {
    state.displayCurrency = p.display_currency as CurrencyId
    state.statsRateSource = p.stats_rate_source as RateId
    state.timeRange = p.time_range as WalletState['timeRange']
    state.concludedMonths = (p.concluded_months as string[]) ?? []
  }

  return state
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
    upsert('goals', upserts.goals.map((g) => goalToRow(g, userId))),
  ])

  // 2) Upsert de hijos
  await Promise.all([
    upsert('transactions', upserts.transactions.map((t) => transactionToRow(t, userId))),
    upsert('transfers', upserts.transfers.map((t) => transferToRow(t, userId))),
    upsert('budgets', upserts.budgets.map((b) => budgetToRow(b, userId))),
    upsert('goal_contributions', upserts.goalContributions.map((c) => contributionToRow(c, userId))),
  ])

  // 3) Delete de hijos primero
  await Promise.all([
    del('transactions', deletes.transactions),
    del('transfers', deletes.transfers),
    del('budgets', deletes.budgets),
    del('goal_contributions', deletes.goalContributions),
  ])

  // 4) Delete de padres al final
  await Promise.all([
    del('accounts', deletes.accounts),
    del('categories', deletes.categories),
    del('goals', deletes.goals),
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
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    )
  }

  if (errors.length > 0) throw errors[0]
}
