'use client'

import { useMemo, useState } from 'react'
import { Rates } from '@/constants/rates'
import { BudgetTemplate, WalletApi } from '@/hooks/useWallet'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@/components/icons'
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
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { BudgetTemplateFormDialog } from './BudgetTemplateFormDialog'
import { TemplateMigrationDialog } from './TemplateMigrationDialog'

interface BudgetTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletApi
  rates: Rates
  month: string
}

const EPS = 0.005

export function BudgetTemplatesDialog({
  open,
  onOpenChange,
  wallet,
  rates,
  month,
}: BudgetTemplatesDialogProps) {
  const { state, budgetStatusForMonth, applyBudgetTemplate, removeBudgetTemplate } = wallet
  const [form, setForm] = useState<{ open: boolean; editing: BudgetTemplate | null }>({
    open: false,
    editing: null,
  })
  const [migration, setMigration] = useState<{ open: boolean; toTemplateId: string }>({
    open: false,
    toTemplateId: '',
  })
  const [pendingDelete, setPendingDelete] = useState<BudgetTemplate | null>(null)

  const countByTemplate = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of state.budgets) {
      if (b.month !== month) continue
      map.set(b.templateId, (map.get(b.templateId) ?? 0) + 1)
    }
    return map
  }, [state.budgets, month])

  const handleActivate = (templateId: string) => {
    if (templateId === state.activeBudgetTemplateId) return
    const hasLeftover = budgetStatusForMonth(rates, month).some(
      (r) => Math.abs(r.effectiveLimit - r.actual) > EPS
    )
    if (hasLeftover) {
      setMigration({ open: true, toTemplateId: templateId })
    } else {
      applyBudgetTemplate(templateId, month, {})
      notify.success('Plantilla activada')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plantillas de presupuesto</DialogTitle>
            <DialogDescription>
              Grupos de presupuestos reutilizables. Activa una para usar sus presupuestos este mes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {state.budgetTemplates.map((tpl) => {
              const active = tpl.id === state.activeBudgetTemplateId
              const accent = tpl.color ?? DEFAULT_ACCOUNT_COLOR
              const Icon = getAccountIcon(tpl.icon)
              const count = countByTemplate.get(tpl.id) ?? 0
              return (
                <div
                  key={tpl.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
                    active ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                        color: accent,
                      }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-bold">
                        {tpl.name}
                        {active && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            <CheckIcon className="size-3" /> Activa
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tpl.description
                          ? tpl.description
                          : `${count} presupuesto${count === 1 ? '' : 's'} este mes`}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!active && (
                      <Button variant="outline" size="sm" onClick={() => handleActivate(tpl.id)}>
                        Activar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setForm({ open: true, editing: tpl })}
                      aria-label="Editar plantilla"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    {!tpl.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDelete(tpl)}
                        aria-label="Eliminar plantilla"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            <Button
              variant="outline"
              className="mt-1 self-start"
              onClick={() => setForm({ open: true, editing: null })}
            >
              <PlusIcon className="size-4" /> Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BudgetTemplateFormDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        wallet={wallet}
        editing={form.editing}
      />

      <TemplateMigrationDialog
        open={migration.open}
        onOpenChange={(o) => setMigration((m) => ({ ...m, open: o }))}
        wallet={wallet}
        rates={rates}
        toTemplateId={migration.toTemplateId}
        month={month}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDelete?.name}» y sus presupuestos. Los movimientos ya
              registrados no se ven afectados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  removeBudgetTemplate(pendingDelete.id)
                  notify.success('Plantilla eliminada')
                }
                setPendingDelete(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
