import { describe, it, expect } from 'vitest'
import { dayInTimeZone, resolveTimeZone } from '@/lib/timezone'

describe('resolveTimeZone', () => {
  it('usa el primer candidato que sea una zona válida', () => {
    expect(resolveTimeZone('America/Caracas', 'Europe/Madrid')).toBe('America/Caracas')
  })

  it('salta una cookie manipulada o vacía y prueba el siguiente', () => {
    expect(resolveTimeZone('Marte/Olympus', 'Europe/Madrid')).toBe('Europe/Madrid')
    expect(resolveTimeZone(undefined, null, 'Europe/Madrid')).toBe('Europe/Madrid')
  })

  it('sin ningún candidato válido cae en la zona del servidor', () => {
    expect(resolveTimeZone(undefined, 'nada')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
})

describe('dayInTimeZone', () => {
  // 02:30 UTC del 22: en Caracas (UTC−4) todavía es el 21.
  const NOW = new Date('2026-09-22T02:30:00.000Z')

  it('da la fecha del calendario en la zona del usuario', () => {
    expect(dayInTimeZone(NOW, 'America/Caracas')).toBe('2026-09-21')
    expect(dayInTimeZone(NOW, 'Europe/Madrid')).toBe('2026-09-22')
  })

  it('cambia de día a la medianoche local, no a las 24 horas', () => {
    expect(dayInTimeZone(new Date('2026-09-22T03:59:00.000Z'), 'America/Caracas')).toBe('2026-09-21')
    expect(dayInTimeZone(new Date('2026-09-22T04:00:00.000Z'), 'America/Caracas')).toBe('2026-09-22')
  })
})
