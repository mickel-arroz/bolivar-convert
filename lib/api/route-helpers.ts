import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Cliente de Supabase + usuario autenticado para un route handler. Si no hay sesión
 * devuelve `{ response }` con un 401 listo para retornar; si la hay, `{ supabase, user }`.
 */
export async function authenticate(): Promise<
  { supabase: SupabaseClient; user: User; response?: undefined } | { response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: jsonError('No autenticado', 401) }
  }
  return { supabase, user }
}
