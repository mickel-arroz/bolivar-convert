import type { CurrencyId } from '@/constants/currencies'
import type {
  Goal,
  GoalContribution,
  ShoppingList,
  ShoppingListItem,
  StatsBundle,
  TimeRange,
} from '@/hooks/useWallet'
import { parseAmount, parseSigned, rangeStart } from './compute'
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
  /** Aportes menos retiros dentro del rango, en la moneda del plan. */
  contributed: number
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

/** Una lista con algo por pagar o comprado en el rango, en la moneda de visualización. */
export interface ShoppingListStat {
  listId: string
  name: string
  icon?: string
  color?: string
  /** Productos por comprar. */
  pending: number
  /** Restante por pagar hoy. `null` si falta una tasa para convertir. */
  remaining: number | null
  /** Lo comprado dentro del rango. `null` si falta una tasa. */
  purchased: number | null
}

export interface PlansAndListsStats {
  savingsPlans: {
    rows: SavingsPlanStat[]
    /** `null` si ningún plan tiene Meta o falta una tasa. */
    progress: SavingsProgress | null
    /** Lo aportado a todos los planes en el rango, convertido. `null` si falta una tasa. */
    contributed: number | null
  }
  shoppingLists: {
    rows: ShoppingListStat[]
    /** **Restante total por pagar**. `null` si falta una tasa. */
    remaining: number | null
    /** Lo comprado en todas las listas en el rango. `null` si falta una tasa. */
    purchased: number | null
  }
}

/** Lo que devuelve /api/wallet/stats: el bundle del rango más planes y listas. */
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

/** Si una fecha cae dentro del rango; con Todo, siempre. */
function inRange(range: TimeRange, now: Date): (date: string) => boolean {
  if (range === 'all') return () => true
  const start = rangeStart(range, now)
  return (date) => new Date(date) >= start
}

function groupByList(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const byList = new Map<string, ShoppingListItem[]>()
  for (const it of items) {
    const bucket = byList.get(it.listId)
    if (bucket) bucket.push(it)
    else byList.set(it.listId, [it])
  }
  return byList
}

export function computePlansAndListsStats(
  input: PlansAndListsInput,
  resolvedRates: ResolvedRates,
  displayCurrency: CurrencyId,
  range: TimeRange = 'all',
  now: Date = new Date()
): PlansAndListsStats {
  const isInRange = inRange(range, now)
  const rateTo = resolvedRates[displayCurrency] ?? 0

  const savedByGoal = new Map<string, number>()
  const contributedByGoal = new Map<string, number>()
  for (const gc of input.goalContributions) {
    const amount = parseSigned(gc.amount)
    savedByGoal.set(gc.goalId, (savedByGoal.get(gc.goalId) ?? 0) + amount)
    if (isInRange(gc.date)) {
      contributedByGoal.set(gc.goalId, (contributedByGoal.get(gc.goalId) ?? 0) + amount)
    }
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
      contributed: contributedByGoal.get(g.id) ?? 0,
      target: target > 0 ? target : null,
    }
  })
  const convertible =
    rateTo > 0 && plans.every((p) => p.contributed === 0 || (resolvedRates[p.currency] ?? 0) > 0)
  const contributed = convertible
    ? plans.reduce((sum, p) => sum + (p.contributed * (resolvedRates[p.currency] ?? 0)) / rateTo, 0)
    : null

  const pendingByList = groupByList(input.shoppingItems.filter((it) => !it.purchased))
  const boughtByList = groupByList(
    input.shoppingItems.filter((it) => it.purchased && it.purchase && isInRange(it.purchase.date))
  )

  const rows: ShoppingListStat[] = []
  const pending: ShoppingListItem[] = []
  const bought: ShoppingListItem[] = []
  const lists = [...input.shoppingLists].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const list of lists) {
    const listPending = pendingByList.get(list.id) ?? []
    const listBought = boughtByList.get(list.id) ?? []
    const { remaining } = computeShoppingTotals(listPending, resolvedRates, displayCurrency)
    const { total: purchased } = computeShoppingTotals(listBought, resolvedRates, displayCurrency)
    const somethingLeft = listPending.length > 0 && (remaining === null || remaining > 0)
    const somethingBought = listBought.length > 0 && (purchased === null || purchased > 0)
    if (!somethingLeft && !somethingBought) continue
    pending.push(...listPending)
    bought.push(...listBought)
    rows.push({
      listId: list.id,
      name: list.name,
      icon: list.icon,
      color: list.color,
      pending: listPending.length,
      remaining,
      purchased,
    })
  }

  return {
    savingsPlans: {
      rows: plans,
      progress: savingsProgress(plans, resolvedRates, displayCurrency),
      contributed,
    },
    shoppingLists: {
      rows,
      remaining: computeShoppingTotals(pending, resolvedRates, displayCurrency).remaining,
      purchased: computeShoppingTotals(bought, resolvedRates, displayCurrency).total,
    },
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
  savingsPlans: { rows: [], progress: null, contributed: 0 },
  shoppingLists: { rows: [], remaining: 0, purchased: 0 },
}
