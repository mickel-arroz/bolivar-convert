import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna la fecha actual en la zona horaria de Venezuela (America/Caracas)
 * formateada como YYYY-MM-DD para comparaciones de caché.
 */
export function getVEDataString() {
  const now = new Date()
  return now
    .toLocaleDateString('en-CA', {
      timeZone: 'America/Caracas'
    })
    .split(',')[0] // 'YYYY-MM-DD'
}
