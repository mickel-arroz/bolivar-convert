/**
 * Migración one-time del localStorage legado (`bolivar_wallet_v1`) a la nube.
 *
 * Se ofrece la primera vez que un usuario inicia sesión y su billetera en la
 * nube está vacía. Calcula el delta (con `buildWalletDelta`) contra el estado
 * actual de la nube y lo sube vía los endpoints internos `/api/wallet/*`.
 */
import { buildWalletDelta, isEmptyDelta } from '@/lib/wallet/delta'
import {
  WALLET_STORAGE_KEY,
  mergeCategories,
  DEFAULT_STATE,
  DEFAULT_BUDGET_TEMPLATE_ID,
  type WalletState,
} from '@/hooks/useWallet'

/** Marca de que la migración ya se ofreció/realizó (para no volver a preguntar). */
export const MIGRATION_FLAG = 'bolivar_wallet_migrated_v1'

/** Lee el estado legado del localStorage, o null si no existe/está corrupto. */
export function readLegacyWallet(): Partial<WalletState> | null {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<WalletState>
  } catch {
    return null
  }
}

/** Cantidad de elementos "reales" en el estado legado (para mostrar en el aviso). */
export function legacyItemCount(state: Partial<WalletState> | null): number {
  if (!state) return 0
  return (
    (state.accounts?.length ?? 0) +
    (state.transactions?.length ?? 0) +
    (state.transfers?.length ?? 0) +
    (state.goals?.length ?? 0)
  )
}

function completeState(p: Partial<WalletState>): WalletState {
  return {
    ...DEFAULT_STATE,
    ...p,
    accounts: p.accounts ?? [],
    transactions: p.transactions ?? [],
    transfers: p.transfers ?? [],
    categories: p.categories && p.categories.length > 0 ? p.categories : DEFAULT_STATE.categories,
    budgets: (p.budgets ?? []).map((b) => ({
      ...b,
      templateId: b.templateId ?? DEFAULT_BUDGET_TEMPLATE_ID,
    })),
    budgetTemplates: p.budgetTemplates ?? DEFAULT_STATE.budgetTemplates,
    budgetTransfers: p.budgetTransfers ?? [],
    goals: p.goals ?? [],
    goalContributions: p.goalContributions ?? [],
    concludedMonths: p.concludedMonths ?? [],
    activeBudgetTemplateId: p.activeBudgetTemplateId ?? DEFAULT_STATE.activeBudgetTemplateId,
  }
}

/**
 * Sube los datos locales a la nube vía los endpoints internos. Toma el estado
 * actual de la nube como base (categorías por defecto ya sembradas), calcula el
 * delta contra el estado legado y lo envía a `/api/wallet/sync`.
 */
export async function migrateLocalToCloud(): Promise<void> {
  const legacy = readLegacyWallet()
  if (!legacy) return

  const res = await fetch('/api/wallet/state')
  if (!res.ok) throw new Error('No se pudo leer el estado actual de la nube.')
  const base = completeState((await res.json()) as Partial<WalletState>)

  const next = completeState({
    ...legacy,
    accounts: (legacy.accounts ?? []).map((a) => ({ ...a, icon: a.icon ?? 'wallet' })),
    categories: mergeCategories(legacy.categories),
  })

  const delta = buildWalletDelta(base, next)
  if (isEmptyDelta(delta)) return

  const syncRes = await fetch('/api/wallet/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(delta),
  })
  if (!syncRes.ok) throw new Error('No se pudieron subir los datos.')
}
