'use client'

import { useState } from 'react'
import type { WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { RefreshIcon } from '@/components/icons'
import { notify } from '@/lib/notify'

type ResetMode = 'money' | 'all'

const CONFIRM_COPY: Record<ResetMode, { title: string; description: string }> = {
  money: {
    title: 'Vaciar saldos y movimientos',
    description:
      'Tus cuentas quedarán en cero y se eliminarán todos los movimientos, traspasos y aportes a metas. Los presupuestos, metas y compras se conservan, pero sin dinero. Esta acción no se puede deshacer.',
  },
  all: {
    title: 'Restablecer toda la billetera',
    description:
      'Se eliminará absolutamente todo: cuentas, categorías propias, presupuestos, plantillas, metas y listas de compras. Tu billetera quedará como recién creada. Esta acción no se puede deshacer.',
  },
}

interface ResetWalletProps {
  wallet: WalletApi
}

export function ResetWallet({ wallet }: ResetWalletProps) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<ResetMode | null>(null)
  const [busy, setBusy] = useState(false)

  const chooseMode = (mode: ResetMode) => {
    setOptionsOpen(false)
    setPendingMode(mode)
  }

  const handleConfirm = async () => {
    if (!pendingMode) return
    setBusy(true)
    const ok = await wallet.resetWallet(pendingMode)
    setBusy(false)
    if (ok) {
      notify.success('Billetera restablecida')
      setPendingMode(null)
    }
  }

  const confirm = pendingMode ? CONFIRM_COPY[pendingMode] : null

  return (
    <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-end sm:justify-between">
      <p className="text-[11px] text-muted-foreground sm:flex-1">
        Restablecer vacía el dinero de tu billetera o la deja como nueva. La acción no se puede deshacer.
      </p>
      <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
        <Button size="sm" variant="outline" onClick={() => setOptionsOpen(true)}>
          <RefreshIcon /> Restablecer
        </Button>
      </div>

      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer billetera</DialogTitle>
            <DialogDescription>
              Elige qué deseas restablecer. Podrás confirmar antes de aplicar los cambios.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => chooseMode('money')}
              className="flex flex-col gap-1 rounded-xl border border-border/60 p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="font-bold text-foreground">Solo saldos y movimientos</span>
              <span className="text-xs text-muted-foreground">
                Vacía cuentas, presupuestos y metas y borra los movimientos. Conserva cuentas,
                presupuestos, categorías, metas y listas de compras.
              </span>
            </button>
            <button
              type="button"
              onClick={() => chooseMode('all')}
              className="flex flex-col gap-1 rounded-xl border border-destructive/40 p-4 text-left transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              <span className="font-bold text-destructive">Restablecer todo</span>
              <span className="text-xs text-muted-foreground">
                Borra absolutamente todo y deja la billetera como recién creada, con solo las
                categorías por defecto.
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingMode}
        onOpenChange={(o) => {
          if (!o && !busy) setPendingMode(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={handleConfirm}>
              {busy ? 'Restableciendo…' : 'Restablecer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
