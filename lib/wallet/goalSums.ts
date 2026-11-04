import type { GoalContribution, TimeRange } from '@/hooks/useWallet'
import { parseSigned, rangeStart } from './compute'

/** Si una fecha cae dentro del Periodo; con Todo, siempre. */
export function inPeriod(range: TimeRange, now: Date = new Date()): (date: string) => boolean {
  if (range === 'all') return () => true
  const start = rangeStart(range, now)
  return (date) => new Date(date) >= start
}

/**
 * Por plan: lo ahorrado (todos sus aportes menos retiros) y el Aportado en el periodo (solo
 * los movimientos con fecha dentro de él), ambos en la moneda del plan.
 */
export function sumGoalContributions(
  contributions: readonly GoalContribution[],
  isInPeriod: (date: string) => boolean
): { saved: Map<string, number>; contributed: Map<string, number> } {
  const saved = new Map<string, number>()
  const contributed = new Map<string, number>()
  for (const gc of contributions) {
    const amount = parseSigned(gc.amount)
    saved.set(gc.goalId, (saved.get(gc.goalId) ?? 0) + amount)
    if (isInPeriod(gc.date)) {
      contributed.set(gc.goalId, (contributed.get(gc.goalId) ?? 0) + amount)
    }
  }
  return { saved, contributed }
}
