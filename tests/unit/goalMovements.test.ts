import { describe, it, expect } from 'vitest'
import { activeContributions, buildGoalMovements } from '@/lib/wallet/goalMovements'
import type { GoalContribution } from '@/hooks/useWallet'

const gc = (o: Partial<GoalContribution> & { id: string; amount: string }): GoalContribution => ({
  goalId: 'g1',
  date: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
  ...o,
})

describe('buildGoalMovements', () => {
  it('un aporte desde una cuenta es un movimiento de entrada', () => {
    const [m] = buildGoalMovements([{ id: 'g1' }], [gc({ id: 'c1', amount: '100', accountId: 'a1' })])

    expect(m).toMatchObject({ id: 'c1', direction: 'in', amount: 100, accountId: 'a1', unattributed: 0 })
  })

  it('un retiro con parte sin cuenta es un solo movimiento por el total', () => {
    const moves = buildGoalMovements(
      [{ id: 'g1' }],
      [
        gc({ id: 'c1', amount: '-100', accountId: 'a1', movementId: 'm1' }),
        gc({ id: 'c2', amount: '-30', movementId: 'm1' }),
      ]
    )

    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ id: 'm1', direction: 'out', amount: 130, unattributed: 30 })
  })

  it('el sobrante que llegó al concluir un mes no es un movimiento', () => {
    expect(buildGoalMovements([{ id: 'g1' }], [gc({ id: 'c1', amount: '50' })])).toHaveLength(0)
  })

  it('los aportes de un plan completado no se muestran ni apartan dinero', () => {
    const goals = [{ id: 'g1', completedAt: '2026-10-05T00:00:00.000Z' }]
    const contributions = [gc({ id: 'c1', amount: '100', accountId: 'a1' })]

    expect(buildGoalMovements(goals, contributions)).toHaveLength(0)
    expect(activeContributions(goals, contributions)).toHaveLength(0)
  })
})
