/**
 * Almacenamiento del consejo en Supabase — SOLO servidor.
 *
 * Vive aparte de `server.ts` porque el consejo tiene su propia tabla y su propio
 * endpoint: `server.ts` cambia por la persistencia de la billetera y las lecturas
 * por tab, y este módulo por cómo se guarda y se arma el consejo.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RateId } from '@/constants/rates'
import { DEFAULT_DISPLAY_CURRENCY } from '@/lib/wallet/displayCurrency'
import { DEFAULT_BUDGET_TEMPLATE_ID } from '@/lib/wallet/compute'
import { loadWallet } from '@/lib/wallet/server'
import { statsFromStorage, type AdviceDayState, type StoredAdvice } from '@/lib/wallet/advice'
import type { AdviceInput } from '@/lib/wallet/advicePayload'

/** Id fijo de la única fila de consejo por usuario (ver migración 0009). */
const ADVICE_ROW_ID = 'advice_current'

/** La fila del usuario: el consejo guardado (si hay) y el estado de su día. */
export interface StoredAdviceRow {
  advice: StoredAdvice | null
  day: AdviceDayState
}

/** Lee el consejo guardado del usuario y el estado de su día. */
export async function loadAdvice(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredAdviceRow> {
  const { data, error } = await supabase
    .from('advice')
    .select('*')
    .eq('user_id', userId)
    .eq('id', ADVICE_ROW_ID)
    .maybeSingle()
  if (error) throw error
  const row = data as Record<string, unknown> | null
  const day: AdviceDayState = {
    adviceDate: (row?.advice_date as string | null) ?? null,
    attemptDate: (row?.attempt_date as string | null) ?? null,
    attemptCount: Number(row?.attempt_count ?? 0),
  }
  // Reclamar el día crea la fila antes que el consejo: sin textos no hay nada guardado.
  const stats = statsFromStorage(row?.stats_by_period, row?.stats_text as string | null)
  if (!stats || !row?.budget_text) return { advice: null, day }
  return {
    advice: {
      stats,
      budget: String(row.budget_text),
      generatedAt: String(row.generated_at ?? ''),
    },
    day,
  }
}

/** Guarda (o reemplaza) el consejo del usuario como el de `day`. */
export async function saveAdvice(
  supabase: SupabaseClient,
  userId: string,
  advice: StoredAdvice,
  day: string
): Promise<void> {
  const { error } = await supabase.from('advice').upsert(
    {
      id: ADVICE_ROW_ID,
      user_id: userId,
      stats_by_period: advice.stats,
      stats_text: advice.stats['1m'],
      budget_text: advice.budget,
      generated_at: advice.generatedAt,
      advice_date: day,
      attempt_started_at: null,
    },
    { onConflict: 'user_id,id' }
  )
  if (error) throw error
}

/**
 * Reclama un intento de generación para `day` (migración 0015). `true` solo si a esta
 * petición le toca llamar a la IA: otra pestaña o dispositivo no lo recibe a la vez.
 */
export async function claimAdviceDay(supabase: SupabaseClient, day: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_advice_day', { p_day: day })
  if (error) throw error
  return data === true
}

/** Suelta la reserva del intento en vuelo tras un fallo, para que la próxima entrada reintente. */
export async function releaseAdviceDay(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('advice')
    .update({ attempt_started_at: null })
    .eq('user_id', userId)
    .eq('id', ADVICE_ROW_ID)
  if (error) throw error
}

/**
 * Lo que hace falta para armar el payload del consejo. Reusa la lectura completa de
 * la billetera y solo se queda con los presupuestos de la plantilla activa, que son
 * los que el usuario tiene a la vista.
 */
export async function loadAdviceInput(
  supabase: SupabaseClient,
  userId: string
): Promise<AdviceInput> {
  const state = await loadWallet(supabase, userId)
  const activeTemplateId = state.activeBudgetTemplateId ?? DEFAULT_BUDGET_TEMPLATE_ID

  return {
    accounts: state.accounts ?? [],
    transactions: state.transactions ?? [],
    transfers: state.transfers ?? [],
    categories: state.categories ?? [],
    budgets: (state.budgets ?? []).filter((b) => b.templateId === activeTemplateId),
    budgetTransfers: state.budgetTransfers ?? [],
    goals: state.goals ?? [],
    goalContributions: state.goalContributions ?? [],
    shoppingLists: state.shoppingLists ?? [],
    shoppingItems: state.shoppingItems ?? [],
    displayCurrency: state.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY,
    statsRateSource: (state.statsRateSource as RateId | undefined) ?? 'bcvUsd',
  }
}
