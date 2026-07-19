import { NextRequest, NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import {
  applyWalletDelta,
  assertNoDuplicateBudgetTitles,
  assertNoDuplicateCategoryNames,
  BudgetTitleConflictError,
  CategoryNameConflictError,
} from '@/lib/wallet/server'
import type { WalletDelta } from '@/lib/wallet/delta'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const delta = (await request.json()) as WalletDelta
    await assertNoDuplicateCategoryNames(auth.supabase, auth.user.id, delta)
    await assertNoDuplicateBudgetTitles(auth.supabase, auth.user.id, delta)
    await applyWalletDelta(auth.supabase, auth.user.id, delta)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof BudgetTitleConflictError || error instanceof CategoryNameConflictError) {
      return jsonError(error.message, 409)
    }
    console.error('[api/wallet/sync]', error)
    return jsonError('No se pudo sincronizar la billetera', 500)
  }
}
