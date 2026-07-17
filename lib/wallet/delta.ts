/**
 * Cálculo del delta de la billetera (puro, apto para el navegador).
 *
 * `useWallet` mantiene el estado en memoria; en cada cambio se calcula el delta
 * respecto al último estado confirmado y se envía a `POST /api/wallet/sync`. El
 * servidor es el único que escribe en Supabase. Aquí NO se toca la red ni el SDK.
 */
import type {
  WalletState,
  Account,
  Category,
  Transaction,
  Transfer,
  Budget,
  Goal,
  GoalContribution,
} from '@/hooks/useWallet'
import type { CurrencyId } from '@/constants/currencies'
import type { RateId } from '@/constants/rates'

/** Preferencias del usuario (fila `profiles`). */
export interface WalletPrefs {
  displayCurrency: CurrencyId
  statsRateSource: RateId
  timeRange: WalletState['timeRange']
  concludedMonths: string[]
}

/** Cambios a persistir: upserts (objetos de dominio, sin user_id) y deletes por id. */
export interface WalletDelta {
  upserts: {
    accounts: Account[]
    categories: Category[]
    goals: Goal[]
    transactions: Transaction[]
    transfers: Transfer[]
    budgets: Budget[]
    goalContributions: GoalContribution[]
  }
  deletes: {
    accounts: string[]
    categories: string[]
    goals: string[]
    transactions: string[]
    transfers: string[]
    budgets: string[]
    goalContributions: string[]
  }
  prefs: WalletPrefs | null
}

interface Diff<T> {
  upserts: T[]
  deletes: string[]
}

/** Compara dos colecciones por id: nuevas/cambiadas → upsert; ausentes → delete. */
function diff<T extends { id: string }>(prev: T[], next: T[]): Diff<T> {
  const prevById = new Map(prev.map((x) => [x.id, x]))
  const nextIds = new Set(next.map((x) => x.id))
  const upserts = next.filter((item) => {
    const p = prevById.get(item.id)
    return !p || JSON.stringify(p) !== JSON.stringify(item)
  })
  const deletes = prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
  return { upserts, deletes }
}

function prefsChanged(prev: WalletState, next: WalletState): boolean {
  return (
    prev.displayCurrency !== next.displayCurrency ||
    prev.statsRateSource !== next.statsRateSource ||
    prev.timeRange !== next.timeRange ||
    JSON.stringify(prev.concludedMonths) !== JSON.stringify(next.concludedMonths)
  )
}

/** Construye el delta entre `prev` y `next`. */
export function buildWalletDelta(prev: WalletState, next: WalletState): WalletDelta {
  const dAccounts = diff(prev.accounts, next.accounts)
  const dCategories = diff(prev.categories, next.categories)
  const dGoals = diff(prev.goals, next.goals)
  const dTransactions = diff(prev.transactions, next.transactions)
  const dTransfers = diff(prev.transfers, next.transfers)
  const dBudgets = diff(prev.budgets, next.budgets)
  const dContributions = diff(prev.goalContributions, next.goalContributions)

  return {
    upserts: {
      accounts: dAccounts.upserts,
      categories: dCategories.upserts,
      goals: dGoals.upserts,
      transactions: dTransactions.upserts,
      transfers: dTransfers.upserts,
      budgets: dBudgets.upserts,
      goalContributions: dContributions.upserts,
    },
    deletes: {
      accounts: dAccounts.deletes,
      categories: dCategories.deletes,
      goals: dGoals.deletes,
      transactions: dTransactions.deletes,
      transfers: dTransfers.deletes,
      budgets: dBudgets.deletes,
      goalContributions: dContributions.deletes,
    },
    prefs: prefsChanged(prev, next)
      ? {
          displayCurrency: next.displayCurrency,
          statsRateSource: next.statsRateSource,
          timeRange: next.timeRange,
          concludedMonths: next.concludedMonths,
        }
      : null,
  }
}

/** True si el delta no tiene nada que persistir. */
export function isEmptyDelta(d: WalletDelta): boolean {
  if (d.prefs) return false
  const u = d.upserts
  const del = d.deletes
  return (
    u.accounts.length === 0 &&
    u.categories.length === 0 &&
    u.goals.length === 0 &&
    u.transactions.length === 0 &&
    u.transfers.length === 0 &&
    u.budgets.length === 0 &&
    u.goalContributions.length === 0 &&
    del.accounts.length === 0 &&
    del.categories.length === 0 &&
    del.goals.length === 0 &&
    del.transactions.length === 0 &&
    del.transfers.length === 0 &&
    del.budgets.length === 0 &&
    del.goalContributions.length === 0
  )
}
