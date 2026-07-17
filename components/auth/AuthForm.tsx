'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { GoogleIcon, WalletIcon } from '@/components/icons'

type Mode = 'login' | 'register'

interface AuthFormProps {
  mode: Mode
}

const COPY = {
  login: {
    title: 'Iniciar sesión',
    description: 'Accede a tu billetera en la nube.',
    submit: 'Iniciar sesión',
    switchText: '¿No tienes cuenta?',
    switchCta: 'Regístrate',
    switchHref: '/register',
  },
  register: {
    title: 'Crear cuenta',
    description: 'Guarda tus cuentas y movimientos de forma segura.',
    submit: 'Registrarme',
    switchText: '¿Ya tienes cuenta?',
    switchCta: 'Inicia sesión',
    switchHref: '/login',
  },
} as const

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/billetera'
  const copy = COPY[mode]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'No se pudo completar el inicio de sesión.' : null
  )
  const [info, setInfo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(redirect)
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          },
        })
        if (error) throw error
        if (data.session) {
          // Sesión inmediata (confirmación de correo desactivada).
          router.push(redirect)
          router.refresh()
        } else {
          setInfo('Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        // Forzar el selector de cuenta de Google en vez de entrar en automático.
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // En éxito, el navegador redirige a Google; no hay que hacer nada más.
  }

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <WalletIcon className="size-6" />
          </div>
          <CardTitle className="text-lg">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon className="size-4" />
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-primary">{info}</p>}

            <Button type="submit" className="mt-1 h-10 w-full" disabled={loading}>
              {loading ? 'Procesando…' : copy.submit}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {copy.switchText}{' '}
            <Link href={copy.switchHref} className="font-medium text-primary hover:underline">
              {copy.switchCta}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
