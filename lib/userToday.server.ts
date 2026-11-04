import { cookies, headers } from 'next/headers'
import { dayInTimeZone, resolveTimeZone, TZ_COOKIE } from '@/lib/timezone'

/**
 * El día (yyyy-MM-dd) del usuario de la petición, en la zona de su dispositivo: la
 * cookie `tz`, luego la geolocalización por IP de Vercel (cubre la primera visita,
 * antes de que exista la cookie) y por último la zona del servidor.
 */
export async function getUserToday(): Promise<string> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const timeZone = resolveTimeZone(
    cookieStore.get(TZ_COOKIE)?.value,
    headerStore.get('x-vercel-ip-timezone')
  )
  return dayInTimeZone(new Date(), timeZone)
}
