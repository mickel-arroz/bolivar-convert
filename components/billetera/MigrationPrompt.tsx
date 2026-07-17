'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertIcon, UploadIcon } from '@/components/icons'
import {
  MIGRATION_FLAG,
  legacyItemCount,
  migrateLocalToCloud,
  readLegacyWallet,
} from '@/lib/migrateLocalToCloud'

/**
 * Ofrece subir a la nube los datos legados del localStorage la primera vez que
 * la billetera en la nube está vacía. Solo se muestra una vez (marca en
 * localStorage) y reutiliza `migrateLocalToCloud`.
 */
export function MigrationPrompt({ cloudHasData }: { cloudHasData: boolean }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')

  useEffect(() => {
    if (cloudHasData) return
    try {
      if (localStorage.getItem(MIGRATION_FLAG)) return
    } catch {
      return
    }
    const n = legacyItemCount(readLegacyWallet())
    if (n > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(n)
      setOpen(true)
    }
  }, [cloudHasData])

  const handleMigrate = async () => {
    setStatus('working')
    try {
      await migrateLocalToCloud()
      try {
        localStorage.setItem(MIGRATION_FLAG, '1')
      } catch {
        /* ignore */
      }
      // useWallet solo carga al montar: recargar para re-hidratar desde la nube.
      window.location.reload()
    } catch {
      setStatus('error')
    }
  }

  const handleSkip = () => {
    try {
      localStorage.setItem(MIGRATION_FLAG, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && status !== 'working') setOpen(false)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tienes datos guardados en este dispositivo</DialogTitle>
          <DialogDescription>
            Encontramos {count} {count === 1 ? 'elemento' : 'elementos'} de tu billetera guardados
            en este navegador. ¿Quieres subirlos a tu cuenta para tenerlos en la nube?
          </DialogDescription>
        </DialogHeader>

        {status === 'error' && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            No se pudieron subir los datos. Intenta de nuevo.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleSkip} disabled={status === 'working'}>
            Empezar vacío
          </Button>
          <Button onClick={handleMigrate} disabled={status === 'working'}>
            <UploadIcon className="size-4" />
            {status === 'working' ? 'Subiendo…' : 'Subir mis datos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
