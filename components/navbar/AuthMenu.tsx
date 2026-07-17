'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { UserIcon, CloseIcon } from '@/components/icons'

/** Control de sesión en el header: menú de usuario o enlace para iniciar sesión. */
export function AuthMenu() {
  const { user, loading, signOut } = useAuth()
  const [avatarError, setAvatarError] = useState(false)

  if (loading) {
    return <div className="size-8 animate-pulse rounded-lg bg-muted/50" aria-hidden />
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        nativeButton={false}
        render={<Link href="/login" />}
      >
        <UserIcon className="size-4" />
        <span className="hidden sm:inline">Iniciar sesión</span>
      </Button>
    )
  }

  // Datos del proveedor OAuth (Google): foto y nombre viven en user_metadata.
  const meta = user.user_metadata ?? {}
  const avatarUrl = (meta.avatar_url || meta.picture) as string | undefined
  const fullName = (meta.full_name || meta.name) as string | undefined
  const email = user.email
  const showAvatar = !!avatarUrl && !avatarError

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cuenta"
            className="overflow-hidden rounded-full"
          >
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName || email || 'Perfil'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="size-[1.2rem]" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        <div className="flex flex-col px-1.5 py-1">
          {fullName && (
            <span className="truncate text-sm font-medium text-foreground">{fullName}</span>
          )}
          {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <CloseIcon className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
