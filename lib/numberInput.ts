/**
 * Utilidades para limitar la cantidad de dígitos en inputs numéricos escritos por
 * el usuario. Solo aplica a la ENTRADA (evita montos con demasiados dígitos); las
 * sumatorias y cifras mostradas no se limitan.
 */

/** Máximos por defecto para montos/tasas. */
export const MAX_INTEGER_DIGITS = 12
export const MAX_DECIMALS = 2

export interface DigitLimitOptions {
  /** Dígitos máximos en la parte entera (default 12). */
  maxIntegerDigits?: number
  /** Decimales máximos (default 2; usar 0 para enteros). */
  maxDecimals?: number
  /** Permitir un signo negativo inicial (default false). */
  allowNegative?: boolean
}

/**
 * Sanea y recorta un valor de input numérico. Acepta `.` o `,` como separador
 * decimal (se normaliza a `.`), un solo separador y, opcionalmente, un signo
 * negativo inicial. Conserva un `.` final mientras el usuario escribe.
 */
export function clampDigits(raw: string, opts: DigitLimitOptions = {}): string {
  const {
    maxIntegerDigits = MAX_INTEGER_DIGITS,
    maxDecimals = MAX_DECIMALS,
    allowNegative = false,
  } = opts

  if (raw === '') return ''

  let s = raw.replace(/,/g, '.')

  let sign = ''
  if (allowNegative && s.startsWith('-')) {
    sign = '-'
    s = s.slice(1)
  }

  // Solo dígitos y puntos.
  s = s.replace(/[^0-9.]/g, '')

  // Un solo separador decimal (se conserva el primero).
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }

  const hasDot = s.includes('.')
  const [intRaw, decRaw = ''] = s.split('.')
  const intPart = intRaw.slice(0, maxIntegerDigits)

  if (maxDecimals <= 0) {
    return sign + intPart
  }

  const decPart = decRaw.slice(0, maxDecimals)
  return sign + intPart + (hasDot ? '.' + decPart : '')
}

/** Solo enteros positivos, con un máximo de dígitos (p. ej. cantidad de personas). */
export function clampInteger(raw: string, maxDigits = 4): string {
  return raw.replace(/[^0-9]/g, '').slice(0, maxDigits)
}
