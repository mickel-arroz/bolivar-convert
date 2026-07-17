import { Suspense } from 'react'
import { Metadata } from 'next'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata: Metadata = {
  title: 'Crear cuenta | Bolívar Convert',
  description: 'Regístrate para guardar tu billetera en la nube.',
}

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  )
}
