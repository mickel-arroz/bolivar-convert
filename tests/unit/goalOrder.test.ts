import { describe, expect, it } from 'vitest'
import { isGoalReached, sortGoalsForDisplay } from '@/lib/wallet/goalOrder'

const goal = (id: string, name: string, target: string) => ({ id, name, target })

describe('isGoalReached', () => {
  it('alcanza la Meta cuando lo ahorrado llega o la supera', () => {
    expect(isGoalReached(100, 100)).toBe(true)
    expect(isGoalReached(150, 100)).toBe(true)
    expect(isGoalReached(99.99, 100)).toBe(false)
  })

  it('un plan sin Meta nunca la alcanza', () => {
    expect(isGoalReached(500, 0)).toBe(false)
  })
})

describe('sortGoalsForDisplay', () => {
  it('pone los planes con Meta alcanzada después de todos los demás', () => {
    const goals = [goal('a', 'Auto', '100'), goal('b', 'Bici', '100'), goal('c', 'Casa', '100')]
    const saved = new Map([
      ['a', 100],
      ['b', 20],
      ['c', 0],
    ])
    expect(sortGoalsForDisplay(goals, saved).map((g) => g.id)).toEqual(['b', 'c', 'a'])
  })

  it('deja los planes sin Meta en el primer grupo', () => {
    const goals = [goal('a', 'Auto', '100'), goal('z', 'Zapatos', '0')]
    const saved = new Map([
      ['a', 100],
      ['z', 1000],
    ])
    expect(sortGoalsForDisplay(goals, saved).map((g) => g.id)).toEqual(['z', 'a'])
  })

  it('ordena cada grupo por nombre, sin distinguir mayúsculas ni acentos', () => {
    const goals = [
      goal('1', 'viaje', '10'),
      goal('2', 'Ahorro', '10'),
      goal('3', 'Zeta', '10'),
      goal('4', 'Ébano', '10'),
    ]
    const saved = new Map([
      ['3', 10],
      ['4', 10],
    ])
    expect(sortGoalsForDisplay(goals, saved).map((g) => g.name)).toEqual([
      'Ahorro',
      'viaje',
      'Ébano',
      'Zeta',
    ])
  })

  it('un retiro que deja el plan bajo su Meta lo devuelve al primer grupo', () => {
    const goals = [goal('a', 'Auto', '100'), goal('b', 'Bici', '100')]
    expect(sortGoalsForDisplay(goals, new Map([['a', 100]])).map((g) => g.id)).toEqual(['b', 'a'])
    expect(sortGoalsForDisplay(goals, new Map([['a', 60]])).map((g) => g.id)).toEqual(['a', 'b'])
  })

  it('un plan sin saldo cuenta como cero ahorrado y no muta la entrada', () => {
    const goals = [goal('b', 'Bici', '50'), goal('a', 'Auto', '50')]
    expect(sortGoalsForDisplay(goals, new Map()).map((g) => g.id)).toEqual(['a', 'b'])
    expect(goals.map((g) => g.id)).toEqual(['b', 'a'])
  })
})
