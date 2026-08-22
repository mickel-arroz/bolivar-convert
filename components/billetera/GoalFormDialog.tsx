'use client'

import { useEffect, useState } from 'react'
import { CurrencyId } from '@/constants/currencies'
import { Goal, WalletApi } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { notify } from '@/lib/notify'
import { Field, AmountField, CurrencyToggle, ColorPicker } from './fields'

const DESC_MAX = 300

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: Goal | null
}

export function GoalFormDialog({ open, onOpenChange, wallet, editing }: GoalFormDialogProps) {
  const { addGoal, updateGoal } = wallet
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyId>('VES')
  const [target, setTarget] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('wallet')
  const [color, setColor] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editing?.name ?? '')
      setCurrency(editing?.currency ?? 'VES')
      setTarget(editing?.target ?? '')
      setDescription(editing?.description ?? '')
      setIcon(editing?.icon ?? 'wallet')
      setColor(editing?.color)
    }
  }, [open, editing])

  const handleSubmit = () => {
    if (!name.trim()) return
    if (editing) {
      updateGoal(editing.id, {
        name: name.trim(),
        currency,
        target: target || undefined,
        description: description.trim() || undefined,
        icon,
        color,
      })
    } else {
      addGoal(name, currency, target, icon, color, description)
    }
    notify.success(editing ? 'Meta actualizada' : 'Meta creada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar meta' : 'Nueva meta'}</DialogTitle>
          <DialogDescription>
            Una alcancía para ahorrar hacia un objetivo (fondo de emergencia, un carro, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Fondo de emergencia, Carro…"
              autoFocus
            />
          </Field>

          <Field label="Moneda">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </Field>

          <AmountField
            label="Objetivo"
            hint="Opcional. Monto que quieres alcanzar (para la barra de progreso)."
            value={target}
            onValueChange={setTarget}
          />

          <Field label="Descripción" hint={`Opcional · ${description.length}/${DESC_MAX}`}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre esta meta…"
              rows={2}
              maxLength={DESC_MAX}
            />
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

          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editing ? 'Guardar' : 'Crear meta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
