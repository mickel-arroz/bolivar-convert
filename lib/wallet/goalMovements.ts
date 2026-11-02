import type { Goal, GoalContribution } from '@/hooks/useWallet'
import { parseSigned } from './compute'

/** Un aporte sin `movementId` (anterior a los movimientos) es su propio movimiento. */
export const movementIdOf = (c: Pick<GoalContribution, 'id' | 'movementId'>): string =>
  c.movementId ?? c.id

/** Aportes que siguen apartando dinero: los de un plan completado ya se gastaron. */
export function activeContributions(
  goals: readonly Pick<Goal, 'id' | 'completedAt'>[],
  contributions: readonly GoalContribution[]
): GoalContribution[] {
  const completed = new Set(goals.filter((g) => g.completedAt).map((g) => g.id))
  if (completed.size === 0) return [...contributions]
  return contributions.filter((c) => !completed.has(c.goalId))
}

/** Un aporte o retiro de un plan tal como se ve en Movimientos. */
export interface GoalMovement {
  id: string
  goalId: string
  accountId: string
  direction: 'in' | 'out'
  /** Total movido, positivo: lo de la cuenta más lo que llegó sin cuenta (en un retiro). */
  amount: number
  /** Parte de un retiro que llegó al plan sin cuenta: entró a la cuenta como ingreso. */
  unattributed: number
  note?: string
  date: string
  createdAt: string
}

/**
 * Agrupa los aportes por movimiento. Solo son movimientos los que tocan una cuenta: el
 * sobrante que llega al concluir un mes no sale de ninguna. Los de un plan completado
 * no se muestran: su dinero ya es el gasto «Planes de ahorro».
 */
export function buildGoalMovements(
  goals: readonly Pick<Goal, 'id' | 'completedAt'>[],
  contributions: readonly GoalContribution[]
): GoalMovement[] {
  const groups = new Map<string, GoalContribution[]>()
  for (const c of activeContributions(goals, contributions)) {
    const id = movementIdOf(c)
    groups.set(id, [...(groups.get(id) ?? []), c])
  }
  const movements: GoalMovement[] = []
  for (const [id, parts] of groups) {
    const withAccount = parts.find((p) => p.accountId)
    if (!withAccount) continue
    const total = parts.reduce((sum, p) => sum + parseSigned(p.amount), 0)
    const unattributed = parts
      .filter((p) => !p.accountId)
      .reduce((sum, p) => sum + Math.abs(parseSigned(p.amount)), 0)
    movements.push({
      id,
      goalId: withAccount.goalId,
      accountId: withAccount.accountId!,
      direction: total < 0 ? 'out' : 'in',
      amount: Math.abs(total),
      unattributed,
      note: withAccount.note,
      date: withAccount.date,
      createdAt: withAccount.createdAt,
    })
  }
  return movements
}
