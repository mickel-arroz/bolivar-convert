import { describe, it, expect } from 'vitest'
import { enumeratePeriods, periodKey, periodLabel, seriesGrouping } from '@/lib/wallet/periods'

const NOW = new Date(2026, 10, 4)

describe('grouping', () => {
  it('1M va por semanas; 6M y 1A por meses', () => {
    expect(seriesGrouping('1m', null, NOW)).toBe('week')
    expect(seriesGrouping('6m', null, NOW)).toBe('month')
    expect(seriesGrouping('1y', null, NOW)).toBe('month')
  })

  it('Todo va por meses hasta 2 años de historia y por trimestres si es más largo', () => {
    expect(seriesGrouping('all', null, NOW)).toBe('month')
    expect(seriesGrouping('all', '2025-01-15', NOW)).toBe('month')
    expect(seriesGrouping('all', '2024-10-31', NOW)).toBe('quarter')
  })
})

describe('periodKey', () => {
  it('la semana empieza el lunes', () => {
    expect(periodKey('2026-11-04', 'week')).toBe('2026-11-02')
    expect(periodKey('2026-11-02', 'week')).toBe('2026-11-02')
    expect(periodKey('2026-11-01', 'week')).toBe('2026-10-26')
    expect(periodKey('2026-11-04T23:30:00', 'week')).toBe('2026-11-02')
  })

  it('mes y trimestre', () => {
    expect(periodKey('2026-11-04', 'month')).toBe('2026-11')
    expect(periodKey('2026-11-04', 'quarter')).toBe('2026-Q4')
    expect(periodKey('2026-01-31', 'quarter')).toBe('2026-Q1')
  })
})

describe('enumeratePeriods', () => {
  it('recorre semanas, meses y trimestres sin huecos', () => {
    expect(enumeratePeriods('2026-10-26', '2026-11-09', 'week')).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
    ])
    expect(enumeratePeriods('2026-11', '2027-01', 'month')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ])
    expect(enumeratePeriods('2025-Q4', '2026-Q2', 'quarter')).toEqual([
      '2025-Q4',
      '2026-Q1',
      '2026-Q2',
    ])
  })

  it('cruza el cambio de año en semanas', () => {
    expect(enumeratePeriods('2026-12-28', '2027-01-04', 'week')).toEqual([
      '2026-12-28',
      '2027-01-04',
    ])
  })
})

describe('periodLabel', () => {
  it('etiquetas cortas por periodo', () => {
    expect(periodLabel('2026-11-02', 'week')).toMatch(/^2 nov/)
    expect(periodLabel('2026-11', 'month')).toMatch(/nov/)
    expect(periodLabel('2026-Q4', 'quarter')).toBe('T4 2026')
  })
})
