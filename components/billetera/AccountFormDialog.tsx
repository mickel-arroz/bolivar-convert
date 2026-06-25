'use client'

import { useEffect, useState } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { Account, WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ACCOUNT_ICON_KEYS, getAccountIcon } from '@/constants/walletCategories'
import { cn } from '@/lib/utils'
import { Field, CurrencyToggle } from './fields'

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addAccount: WalletApi['addAccount']
  updateAccount: WalletApi['updateAccount']
  editing?: Account | null
}

export function AccountFormDialog({
  open,
  onOpenChange,
  addAccount,
  updateAccount,
  editing,
}: AccountFormDialogProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyId>('VES')
  const [openingBalance, setOpeningBalance] = useState('')
  const [icon, setIcon] = useState('wallet')

  // Sincronizar el formulario al abrir / cambiar el objeto en edición
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editing?.name ?? '')
      setCurrency(editing?.currency ?? 'VES')
      setOpeningBalance(editing?.openingBalance ?? '')
      setIcon(editing?.icon ?? 'wallet')
    }
  }, [open, editing])

  const handleSubmit = () => {
    if (!name.trim()) return
    if (editing) {
      updateAccount(editing.id, { name: name.trim(), currency, openingBalance: openingBalance || '0', icon })
    } else {
      addAccount(name, currency, openingBalance, icon)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>
            Una cuenta agrupa tus movimientos en una misma moneda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Efectivo, Banco, Zelle…"
              autoFocus
            />
          </Field>

          <Field label="Moneda">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </Field>

          <Field label="Icono">
            <div className="grid grid-cols-5 gap-1.5">
              {ACCOUNT_ICON_KEYS.map((key) => {
                const Icon = getAccountIcon(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-lg border transition-all',
                      icon === key
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Saldo inicial" hint="Opcional. El saldo se ajusta con tus movimientos.">
            <Input
              type="number"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0,00"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editing ? 'Guardar' : 'Crear cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
