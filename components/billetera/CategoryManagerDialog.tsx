'use client'

import { useMemo, useRef, useState } from 'react'
import { Category, TransactionType, WalletApi } from '@/hooks/useWallet'
import { CATEGORY_ICON_KEYS, getCategoryIcon } from '@/constants/walletCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PencilIcon, TrashIcon, MaximizeIcon, MinimizeIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { Field, TypeToggle, ColorPicker } from './fields'
import { CategoryDeleteDialog } from './CategoryDeleteDialog'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
}

export function CategoryManagerDialog({ open, onOpenChange, wallet }: CategoryManagerDialogProps) {
  const { state, addCategory, updateCategory } = wallet
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState(CATEGORY_ICON_KEYS[0])
  const [color, setColor] = useState<string | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const editingCategory = editingId
    ? state.categories.find((c) => c.id === editingId)
    : undefined

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setKind('expense')
    setIcon(CATEGORY_ICON_KEYS[0])
    setColor(undefined)
  }

  const startEdit = (c: Category) => {
    setEditingId(c.id)
    setName(c.name)
    setKind(c.kind)
    setIcon(c.icon)
    setColor(c.color)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      formRef.current?.querySelector('input')?.focus()
    })
  }

  const handleOpenChange = (o: boolean) => {
    if (!o) setFullscreen(false)
    onOpenChange(o)
  }

  // No permitir dos categorías con el mismo nombre dentro del mismo tipo.
  const duplicateName = useMemo(() => {
    const n = name.trim().toLowerCase()
    if (!n) return false
    const effectiveKind = editingId
      ? (state.categories.find((c) => c.id === editingId)?.kind ?? kind)
      : kind
    return state.categories.some(
      (c) => c.id !== editingId && c.kind === effectiveKind && c.name.trim().toLowerCase() === n
    )
  }, [name, kind, editingId, state.categories])

  const handleSave = () => {
    if (!name.trim() || duplicateName) return
    if (editingId) {
      updateCategory(editingId, { name: name.trim(), icon, color })
    } else {
      addCategory(name, kind, icon, color)
    }
    notify.success(editingId ? 'Categoría actualizada' : 'Categoría creada')
    resetForm()
  }

  const renderGroup = (groupKind: TransactionType, title: string) => {
    const cats = state.categories.filter((c) => c.kind === groupKind)
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className="flex flex-col gap-1">
          {cats.map((c) => {
            const Icon = getCategoryIcon(c.icon)
            const isEditing = editingId === c.id
            return (
              <div
                key={c.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  isEditing ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'
                )}
              >
                <Icon className="size-4 shrink-0" style={c.color ? { color: c.color } : undefined} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => startEdit(c)}
                  aria-label={`Editar ${c.name}`}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPendingDelete(c)}
                  aria-label={`Eliminar ${c.name}`}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'size-interpolate duration-500',
            fullscreen
              ? 'h-[100dvh] w-screen max-h-[100dvh] max-w-[100vw] rounded-none border-0'
              : ''
          )}
        >
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="absolute right-11 top-4 rounded-lg p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
          </button>

          <DialogHeader className="pr-16">
            <DialogTitle>Categorías</DialogTitle>
            <DialogDescription>Crea y organiza tus categorías de gastos e ingresos.</DialogDescription>
          </DialogHeader>

          <div className={cn('flex flex-col gap-5', fullscreen && 'md:flex-row md:items-start md:gap-6')}>
            <div
              ref={formRef}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-3 transition-colors',
                fullscreen && 'self-start md:sticky md:top-0 md:w-[400px] md:shrink-0',
                editingId
                  ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/60 bg-muted/20'
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {editingId ? `Editando: ${editingCategory?.name ?? ''}` : 'Nueva categoría'}
              </span>
              <Field label="Tipo">
                <TypeToggle value={kind} onChange={setKind} />
              </Field>
              <Field label="Nombre">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={editingId ? 'Nombre de la categoría' : 'Nueva categoría'}
                  aria-invalid={duplicateName}
                />
                {duplicateName && (
                  <span className="text-xs text-destructive">
                    Ya existe una categoría con ese nombre.
                  </span>
                )}
              </Field>
              <Field label="Icono">
                <div className="grid grid-cols-5 gap-1.5">
                  {CATEGORY_ICON_KEYS.map((key) => {
                    const Icon = getCategoryIcon(key)
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
              <div className="flex flex-wrap justify-end gap-2">
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar edición
                  </Button>
                )}
                <Button onClick={handleSave} disabled={!name.trim() || duplicateName}>
                  {editingId ? 'Guardar cambios' : 'Agregar categoría'}
                </Button>
              </div>
            </div>

            <div className={cn('flex flex-col gap-5', fullscreen && 'md:flex-1 md:min-w-0')}>
              {renderGroup('expense', 'Gastos')}
              {renderGroup('income', 'Ingresos')}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CategoryDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        wallet={wallet}
        category={pendingDelete}
      />
    </>
  )
}
