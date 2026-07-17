import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback de OAuth: intercambia el `code` por una sesión y redirige al destino.
 * Usado por el inicio de sesión con Google.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/billetera'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      if (isLocal) return NextResponse.redirect(`${origin}${redirect}`)
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${redirect}`)
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
