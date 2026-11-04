/** Cookie donde el navegador guarda la zona horaria del dispositivo (la escribe el layout raíz). */
export const TZ_COOKIE = 'tz'

/**
 * El primer candidato que sea una zona IANA válida. `Intl` lanza con una zona que no
 * existe, así una cookie manipulada no pasa. Sin ninguno válido, la zona del servidor.
 */
export function resolveTimeZone(...candidates: (string | null | undefined)[]): string {
  for (const tz of candidates) {
    if (!tz) continue
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: tz })
      return tz
    } catch {
      /* zona inválida: se prueba la siguiente */
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** La fecha de calendario (yyyy-MM-dd) de `now` en la zona dada. */
export function dayInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
