import type { CurrencyId } from '@/constants/currencies'
import type {
  Goal,
  GoalContribution,
  ShoppingList,
  ShoppingListItem,
  StatsBundle,
} from '@/hooks/useWallet'
import { parseAmount, parseSigned } from './compute'
import { sortGoalsForDisplay } from './goalOrder'
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

/** Una lista con algo por pagar y su Restante por pagar en la moneda de visualización. */
export interface ShoppingListStat {
  listId: string
  name: string
  icon?: string
  color?: string
  /** `null` si falta una tasa para convertir. */
  remaining: number | null
}

export interface PlansAndListsStats {
  savingsPlans: SavingsPlanStat[]
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
  const savingsPlans = sortGoalsForDisplay(activeGoals, savedByGoal).map((g): SavingsPlanStat => {
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
      remaining,
    })
  }
  const { remaining } = computeShoppingTotals(pending, resolvedRates, displayCurrency)

  return { savingsPlans, shoppingLists: { rows, remaining } }
}
