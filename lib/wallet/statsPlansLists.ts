import type { CurrencyId } from '@/constants/currencies'
import type {
  Goal,
  GoalContribution,
  ShoppingList,
  ShoppingListItem,
  StatsBundle,
} from '@/hooks/useWallet'
import { parseAmount, parseSigned } from './compute'
import { isGoalReached, sortGoalsForDisplay } from './goalOrder'
import { computeShoppingTotals, type ResolvedRates } from './shoppingTotals'

/** Un Plan de ahorro activo: lo ahorrado frente a su Meta, en la moneda del plan. */
export interface SavingsPlanStat {
  goalId: string
  name: string
  icon?: string
  color?: string
  currency: CurrencyId
  saved: number
  /** La Meta; `null` si el plan no tiene. */
  target: number | null
}

/**
 * Cuánto se lleva de todas las Metas juntas, en la moneda de visualización. Cada plan
 * aporta como mucho su Meta: lo ahorrado de más en uno no tapa lo que le falta a otro.
 */
export interface SavingsProgress {
  saved: number
  target: number
  /** Planes con Meta alcanzada. */
  reached: number
  /** Planes con Meta. */
  withTarget: number
}

/** Una lista con algo por pagar y su Restante por pagar en la moneda de visualización. */
export interface ShoppingListStat {
  listId: string
  name: string
  icon?: string
  color?: string
  /** Productos por comprar. */
  pending: number
  /** `null` si falta una tasa para convertir. */
  remaining: number | null
}

export interface PlansAndListsStats {
  savingsPlans: {
    rows: SavingsPlanStat[]
    /** `null` si ningún plan tiene Meta o falta una tasa. */
    progress: SavingsProgress | null
  }
  shoppingLists: {
    rows: ShoppingListStat[]
    /** **Restante total por pagar**. `null` si falta una tasa. */
    remaining: number | null
  }
}

/** Lo que devuelve /api/wallet/stats: el bundle del rango más planes y listas, que no dependen de él. */
export type StatsView = StatsBundle & PlansAndListsStats

export interface PlansAndListsInput {
  goals: Goal[]
  goalContributions: GoalContribution[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingListItem[]
}

function savingsProgress(
  plans: SavingsPlanStat[],
  resolvedRates: ResolvedRates,
  displayCurrency: CurrencyId
): SavingsProgress | null {
  const withTarget = plans.filter((p) => p.target !== null)
  const rateTo = resolvedRates[displayCurrency] ?? 0
  if (withTarget.length === 0 || rateTo <= 0) return null
  if (withTarget.some((p) => (resolvedRates[p.currency] ?? 0) <= 0)) return null

  const progress: SavingsProgress = { saved: 0, target: 0, reached: 0, withTarget: 0 }
  for (const p of withTarget) {
    const target = p.target ?? 0
    const factor = resolvedRates[p.currency] / rateTo
    progress.saved += Math.min(Math.max(p.saved, 0), target) * factor
    progress.target += target * factor
    progress.withTarget++
    if (isGoalReached(p.saved, target)) progress.reached++
  }
  return progress
}

export function computePlansAndListsStats(
  input: PlansAndListsInput,
  resolvedRates: ResolvedRates,
  displayCurrency: CurrencyId
): PlansAndListsStats {
  const savedByGoal = new Map<string, number>()
  for (const gc of input.goalContributions) {
    savedByGoal.set(gc.goalId, (savedByGoal.get(gc.goalId) ?? 0) + parseSigned(gc.amount))
  }
  const activeGoals = input.goals.filter((g) => !g.completedAt)
  const plans = sortGoalsForDisplay(activeGoals, savedByGoal).map((g): SavingsPlanStat => {
    const target = parseAmount(g.target)
    return {
      goalId: g.id,
      name: g.name,
      icon: g.icon,
      color: g.color,
      currency: g.currency,
      saved: savedByGoal.get(g.id) ?? 0,
      target: target > 0 ? target : null,
    }
  })

  const pendingByList = new Map<string, ShoppingListItem[]>()
  for (const it of input.shoppingItems) {
    if (it.purchased) continue
    const bucket = pendingByList.get(it.listId)
    if (bucket) bucket.push(it)
    else pendingByList.set(it.listId, [it])
  }

  const rows: ShoppingListStat[] = []
  const pending: ShoppingListItem[] = []
  const lists = [...input.shoppingLists].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const list of lists) {
    const items = pendingByList.get(list.id)
    if (!items) continue
    const { remaining } = computeShoppingTotals(items, resolvedRates, displayCurrency)
    if (remaining !== null && remaining <= 0) continue
    pending.push(...items)
    rows.push({
      listId: list.id,
      name: list.name,
      icon: list.icon,
      color: list.color,
      pending: items.length,
      remaining,
    })
  }
  const { remaining } = computeShoppingTotals(pending, resolvedRates, displayCurrency)

  return {
    savingsPlans: { rows: plans, progress: savingsProgress(plans, resolvedRates, displayCurrency) },
    shoppingLists: { rows, remaining },
  }
}

/** Unas estadísticas sin ningún dato: el punto de partida mientras cargan y en los tests. */
export const EMPTY_STATS_VIEW: StatsView = {
  incomeVsExpense: { income: 0, expense: 0 },
  categorySummary: [],
  monthlySeries: [],
  netWorth: 0,
  netWorthSeries: [],
  budgetStatus: [],
  budgetRange: [],
  budgetUsage: { currency: 'VES', spent: 0, total: 0, ratio: 0, onTrack: 0, over: 0 },
  ratesAvailable: true,
  seriesGranularity: 'month',
  savingsPlans: { rows: [], progress: null },
  shoppingLists: { rows: [], remaining: 0 },
}
