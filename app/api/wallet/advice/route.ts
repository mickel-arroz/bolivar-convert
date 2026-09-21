import { NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadAdvice, loadAdviceInput, saveAdvice } from '@/lib/wallet/adviceServer'
import { getCurrentRates } from '@/lib/rates.server'
import type { Rates } from '@/constants/rates'
import {
  isAdviceStale,
  meetsAdviceThreshold,
  runAdviceChain,
  type StoredAdvice,
} from '@/lib/wallet/advice'
import { buildAdvicePayload, buildAdvicePrompt } from '@/lib/wallet/advicePayload'
import { ADVICE_MODEL_CHAIN, callGemini, hasGoogleAiKey } from '@/lib/ai/gemini'

export const dynamic = 'force-dynamic'

/** Lo guardado del usuario autenticado, o `null` si nunca se generó un consejo. */
export async function GET() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const advice = await loadAdvice(auth.supabase, auth.user.id)
    return NextResponse.json({ advice })
  } catch (error) {
    console.error('[api/wallet/advice GET]', error)
    return jsonError('No se pudo cargar el consejo', 500)
  }
}

/**
 * Regenera el consejo del usuario autenticado si hace falta, y lo guarda.
 *
 * Solo lee y escribe la fila del usuario de la sesión. El resultado no reemplaza lo
 * que el cliente ya tiene en pantalla: se ve en la visita siguiente (ADR 0003).
 */
export async function POST() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const stored = await loadAdvice(auth.supabase, auth.user.id)
    if (!isAdviceStale(stored?.generatedAt)) {
      return NextResponse.json({ advice: stored, refreshed: false })
    }

    const input = await loadAdviceInput(auth.supabase, auth.user.id)
    // Una cuenta recién creada no da para un consejo: ni se llama al modelo.
    if (!meetsAdviceThreshold(input) || !hasGoogleAiKey()) {
      return NextResponse.json({ advice: stored, refreshed: false })
    }

    const current = await getCurrentRates()
    const rates: Rates = {
      bcvUsd: current.bcvUsd,
      bcvEur: current.bcvEur,
      binanceUsdAvg: current.binanceUsdAvg,
      lastUpdate: current.lastUpdate,
    }

    const prompt = buildAdvicePrompt(buildAdvicePayload(input, rates))
    const generated = await runAdviceChain(prompt, ADVICE_MODEL_CHAIN, callGemini)
    // Agotada la cadena, el cliente muestra los textos genéricos pero no se guarda
    // nada: escribirlos con fecha de hoy congelaría el genérico una semana entera.
    if (!generated) return NextResponse.json({ advice: stored, refreshed: false })

    const advice: StoredAdvice = { ...generated, generatedAt: new Date().toISOString() }
    await saveAdvice(auth.supabase, auth.user.id, advice)

    return NextResponse.json({ advice, refreshed: true })
  } catch (error) {
    console.error('[api/wallet/advice POST]', error)
    return jsonError('No se pudo generar el consejo', 500)
  }
}
