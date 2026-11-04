import { NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import {
  claimAdviceDay,
  loadAdvice,
  loadAdviceInput,
  releaseAdviceDay,
  saveAdvice,
} from '@/lib/wallet/adviceServer'
import { getUserToday } from '@/lib/userToday.server'
import { getCurrentRates } from '@/lib/rates.server'
import type { Rates } from '@/constants/rates'
import {
  canAttemptAdviceToday,
  meetsAdviceThreshold,
  runAdviceChain,
  type StoredAdvice,
} from '@/lib/wallet/advice'
import { buildAdvicePayload, buildAdvicePrompt } from '@/lib/wallet/advicePayload'
import { ADVICE_MODEL_CHAIN, callGemini, hasGoogleAiKey } from '@/lib/ai/gemini'

export const dynamic = 'force-dynamic'

/** Lo guardado del usuario autenticado y si toca intentar generar hoy, en su día. */
export async function GET() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const [{ advice, day }, today] = await Promise.all([
      loadAdvice(auth.supabase, auth.user.id),
      getUserToday(),
    ])
    return NextResponse.json({ advice, canAttempt: canAttemptAdviceToday(day, today) })
  } catch (error) {
    console.error('[api/wallet/advice GET]', error)
    return jsonError('No se pudo cargar el consejo', 500)
  }
}

/**
 * Genera el consejo del día del usuario autenticado si le toca, y lo guarda (ADR 0005).
 *
 * Solo lee y escribe la fila del usuario de la sesión. El día se reclama en la base
 * antes de llamar a la IA y queda reservado mientras corre: dos pestañas o
 * dispositivos a la vez producen una sola llamada. Lo nuevo vuelve en la respuesta para reemplazar lo que hay en pantalla.
 */
export async function POST() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const [{ advice: stored, day }, today] = await Promise.all([
      loadAdvice(auth.supabase, auth.user.id),
      getUserToday(),
    ])
    const unchanged = () => NextResponse.json({ advice: stored, refreshed: false })
    if (!canAttemptAdviceToday(day, today)) return unchanged()

    const input = await loadAdviceInput(auth.supabase, auth.user.id)
    // Una cuenta recién creada no da para un consejo: ni se reclama ni se llama al modelo.
    if (!meetsAdviceThreshold(input) || !hasGoogleAiKey()) return unchanged()

    if (!(await claimAdviceDay(auth.supabase, today))) return unchanged()

    const current = await getCurrentRates()
    const rates: Rates = {
      bcvUsd: current.bcvUsd,
      bcvEur: current.bcvEur,
      binanceUsdAvg: current.binanceUsdAvg,
      lastUpdate: current.lastUpdate,
    }

    const prompt = buildAdvicePrompt(buildAdvicePayload(input, rates))
    const generated = await runAdviceChain(prompt, ADVICE_MODEL_CHAIN, callGemini)
    // Agotada la cadena no se guarda nada: el intento queda gastado, pero se suelta su
    // reserva y, mientras queden intentos del día, la próxima entrada vuelve a probar.
    if (!generated) {
      await releaseAdviceDay(auth.supabase, auth.user.id)
      return unchanged()
    }

    const advice: StoredAdvice = { ...generated, generatedAt: new Date().toISOString() }
    await saveAdvice(auth.supabase, auth.user.id, advice, today)

    return NextResponse.json({ advice, refreshed: true })
  } catch (error) {
    console.error('[api/wallet/advice POST]', error)
    return jsonError('No se pudo generar el consejo', 500)
  }
}
