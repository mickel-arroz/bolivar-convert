'use client'

import { useEffect, useState } from 'react'
import { Category, TransactionType, WalletApi } from '@/hooks/useWallet'
import { CATEGORY_ICON_KEYS, isDuplicateCategoryName } from '@/constants/walletCategories'
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
import { notify } from '@/lib/notify'
import { Field, TypeToggle, CategoryIconPicker, ColorPicker } from './fields'

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  editing?: Category | null
}

export function CategoryFormDialog({ open, onOpenChange, wallet, editing }: CategoryFormDialogProps) {
  const { state, addCategory, updateCategory } = wallet
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState(CATEGORY_ICON_KEYS[0])
  const [color, setColor] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editing?.name ?? '')
      setKind(editing?.kind ?? 'expense')
      setIcon(editing?.icon ?? CATEGORY_ICON_KEYS[0])
      setColor(editing?.color)
    }
  }, [open, editing])

  const duplicateName = isDuplicateCategoryName(state.categories, name, kind, editing?.id)
  const canSave = !!name.trim() && !duplicateName

  const handleSave = () => {
    if (!canSave) return
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), icon, color })
    } else {
      addCategory(name, kind, icon, color)
    }
    notify.success(editing ? 'Categoría actualizada' : 'Categoría creada')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar «${editing.name}»` : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Categoría de ${editing.kind === 'income' ? 'ingreso' : 'gasto'}.`
              : 'Agrupa tus gastos o ingresos para seguirlos mejor.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          {!editing && (
            <Field label="Tipo">
              <TypeToggle value={kind} onChange={setKind} />
            </Field>
          )}
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              aria-invalid={duplicateName}
              autoFocus
            />
            {duplicateName && (
              <span className="text-xs text-destructive">Ya existe una categoría con ese nombre.</span>
            )}
          </Field>
          <Field label="Icono">
            <CategoryIconPicker value={icon} onChange={setIcon} color={color} />
          </Field>
          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave}>
              {editing ? 'Guardar cambios' : 'Agregar categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
