import { Suspense } from 'react'
import { Metadata } from 'next'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión | Bolívar Convert',
  description: 'Accede a tu billetera en la nube.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
