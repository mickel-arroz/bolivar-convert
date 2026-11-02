'use client'

import { createElement, useState } from 'react'
import { Category, TransactionType, WalletApi } from '@/hooks/useWallet'
import { useIsCompactScreen } from '@/hooks/useMediaQuery'
import { getCategoryIcon, isSystemCategory, userCategories } from '@/constants/walletCategories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  PencilIcon,
  TrashIcon,
  MaximizeIcon,
  MinimizeIcon,
  PlusIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@/components/icons'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { cn } from '@/lib/utils'
import { CategoryDeleteDialog } from './CategoryDeleteDialog'
import { CategoryFormDialog } from './CategoryFormDialog'

/** Icono de la categoría sobre un círculo teñido con su color. */
function CategoryBadge({ icon, color }: { icon: string; color?: string }) {
  const accent = color ?? DEFAULT_ACCOUNT_COLOR
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{ color: accent, backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)` }}
    >
      {createElement(getCategoryIcon(icon), { className: 'size-4' })}
    </span>
  )
}

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
}

export function CategoryManagerDialog({ open, onOpenChange, wallet }: CategoryManagerDialogProps) {
  const { state } = wallet
  const [form, setForm] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  })
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [expanded, setFullscreen] = useState(false)
  const compact = useIsCompactScreen()
  const fullscreen = expanded || compact

  const handleOpenChange = (o: boolean) => {
    if (!o) setFullscreen(false)
    onOpenChange(o)
  }

  const renderGroup = (groupKind: TransactionType, title: string) => {
    const cats = userCategories(state.categories).filter((c) => c.kind === groupKind)
    const income = groupKind === 'income'
    const TrendIcon = income ? TrendingUpIcon : TrendingDownIcon
    return (
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full',
              income
                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                : 'bg-destructive/15 text-destructive'
            )}
          >
            <TrendIcon className="size-3.5" />
          </span>
          <h3 className="text-sm font-bold">{title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
            {cats.length}
          </span>
        </div>
        <ul className={cn('grid grid-cols-1 gap-2', fullscreen && 'md:grid-cols-2 xl:grid-cols-3')}>
          {cats.map((c) => {
            const system = isSystemCategory(c.id)
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 transition-colors hover:border-border"
              >
                <CategoryBadge icon={c.icon} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  {system && <p className="text-[11px] text-muted-foreground">Predeterminada</p>}
                </div>
                {!system && (
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setForm({ open: true, editing: c })}
                      aria-label={`Editar ${c.name}`}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-destructive"
                      onClick={() => setPendingDelete(c)}
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
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
          actions={
            !compact && (
              <button
                type="button"
                onClick={() => setFullscreen((f) => !f)}
                aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="rounded-full p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
              </button>
            )
          }
        >
          <DialogHeader className={compact ? 'pr-8' : 'pr-16'}>
            <DialogTitle>Categorías</DialogTitle>
            <DialogDescription>Crea y organiza tus categorías de gastos e ingresos.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <Button className="sm:self-start" onClick={() => setForm({ open: true, editing: null })}>
              <PlusIcon className="size-4" /> Nueva categoría
            </Button>
            {renderGroup('expense', 'Gastos')}
            {renderGroup('income', 'Ingresos')}
          </div>
        </DialogContent>
      </Dialog>

      <CategoryFormDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        wallet={wallet}
        editing={form.editing}
      />
      <CategoryDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        wallet={wallet}
        category={pendingDelete}
      />
    </>
  )
}
