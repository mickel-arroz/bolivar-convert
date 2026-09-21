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
import type { StoredAdvice } from '@/lib/wallet/advice'
import type { AdviceInput } from '@/lib/wallet/advicePayload'

/** Id fijo de la única fila de consejo por usuario (ver migración 0009). */
const ADVICE_ROW_ID = 'advice_current'

/** Lee el consejo guardado del usuario. `null` si nunca se generó uno. */
export async function loadAdvice(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredAdvice | null> {
  const { data, error } = await supabase
    .from('advice')
    .select('*')
    .eq('user_id', userId)
    .eq('id', ADVICE_ROW_ID)
    .maybeSingle()
  if (error) throw error
  const row = data as Record<string, unknown> | null
  if (!row) return null
  return {
    stats: String(row.stats_text ?? ''),
    budget: String(row.budget_text ?? ''),
    generatedAt: String(row.generated_at ?? ''),
  }
}

/** Guarda (o reemplaza) el consejo del usuario. */
export async function saveAdvice(
  supabase: SupabaseClient,
  userId: string,
  advice: StoredAdvice
): Promise<void> {
  const { error } = await supabase.from('advice').upsert(
    {
      id: ADVICE_ROW_ID,
      user_id: userId,
      stats_text: advice.stats,
      budget_text: advice.budget,
      generated_at: advice.generatedAt,
    },
    { onConflict: 'user_id,id' }
  )
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
    timeRange: state.timeRange ?? '1m',
  }
}
