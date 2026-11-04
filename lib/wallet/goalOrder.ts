import type { Goal } from '@/hooks/useWallet'
import { parseAmount } from './compute'

/** Meta alcanzada: lo ahorrado llega o supera la Meta; un plan sin Meta nunca la alcanza. */
export const isGoalReached = (saved: number, target: number): boolean =>
  target > 0 && saved >= target

/**
 * Planes como se muestran en Presupuestos: primero los en curso (y los sin Meta), luego los de
 * Meta alcanzada, cada grupo ordenado por nombre.
 */
export function sortGoalsForDisplay<G extends Pick<Goal, 'id' | 'name' | 'target'>>(
  goals: readonly G[],
  savedById: ReadonlyMap<string, number>
): G[] {
  const reached = (g: G) => isGoalReached(savedById.get(g.id) ?? 0, parseAmount(g.target))
  return [...goals].sort(
    (a, b) =>
      Number(reached(a)) - Number(reached(b)) ||
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  )
}
