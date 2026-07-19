'use client'

import { useMemo, useState } from 'react'
import {
  Goal,
  ShoppingList,
  ShoppingListItem,
  StatsBundle,
  WalletApi,
  monthKey,
  formatMonthLabel,
} from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCategoryIcon, getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  PlusIcon,
  TargetIcon,
  PencilIcon,
  TrashIcon,
  AlertIcon,
  RefreshIcon,
  TransferIcon,
  ShoppingCartIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { WalletDialogs } from './dialogs'
import { formatMoney } from './format'
import { ConcludeMonthDialog } from './ConcludeMonthDialog'
import { GoalFormDialog } from './GoalFormDialog'
import { GoalContributionDialog } from './GoalContributionDialog'
import { ShoppingListFormDialog } from './ShoppingListFormDialog'
import { ShoppingListDetailDialog } from './ShoppingListDetailDialog'
import { ShoppingItemFormDialog } from './ShoppingItemFormDialog'
import { ShoppingItemDetailDialog } from './ShoppingItemDetailDialog'
import { ConfirmPurchaseDialog } from './ConfirmPurchaseDialog'

interface PresupuestoTabProps {
  wallet: WalletApi
  stats: StatsBundle
  dialogs: WalletDialogs
  rates: Rates
}

export function PresupuestoTab({ wallet, stats, dialogs, rates }: PresupuestoTabProps) {
  const { state, removeBudget, goalBalances, removeGoal, removeShoppingList } = wallet
  const month = useMemo(() => monthKey(new Date()), [])
  const [concludeOpen, setConcludeOpen] = useState(false)
  const [goalForm, setGoalForm] = useState<{ open: boolean; editing: Goal | null }>({
    open: false,
    editing: null,
  })
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null)
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<Goal | null>(null)

  // Listas de compras
  const [listForm, setListForm] = useState<{ open: boolean; editing: ShoppingList | null }>({
    open: false,
    editing: null,
  })
  const [detailListId, setDetailListId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<{
    open: boolean
    listId: string
    editing: ShoppingListItem | null
  }>({ open: false, listId: '', editing: null })
  const [purchaseItem, setPurchaseItem] = useState<ShoppingListItem | null>(null)
  const [itemDetailId, setItemDetailId] = useState<string | null>(null)
  const [pendingDeleteList, setPendingDeleteList] = useState<ShoppingList | null>(null)

  const goalBalanceById = useMemo(
    () => new Map(goalBalances.map((b) => [b.goalId, b.balance])),
    [goalBalances]
  )

  // Productos agrupados por lista (para contadores en las tarjetas).
  const itemsByList = useMemo(() => {
    const map = new Map<string, ShoppingListItem[]>()
    for (const it of state.shoppingItems) {
      const arr = map.get(it.listId)
      if (arr) arr.push(it)
      else map.set(it.listId, [it])
    }
    return map
  }, [state.shoppingItems])

  // Lista mostrada en el detalle (derivada del estado para reflejar ediciones en vivo).
  const detailList = useMemo(
    () => state.shoppingLists.find((l) => l.id === detailListId) ?? null,
    [state.shoppingLists, detailListId]
  )

  // Producto mostrado en su modal de detalle (derivado del estado).
  const itemDetail = useMemo(
    () => state.shoppingItems.find((it) => it.id === itemDetailId) ?? null,
    [state.shoppingItems, itemDetailId]
  )

  const budgetedCategoryIds = useMemo(
    () => new Set(stats.budgetStatus.map((b) => b.budget.categoryId)),
    [stats.budgetStatus]
  )

  const unbudgeted = useMemo(
    () => state.categories.filter((c) => c.kind === 'expense' && !budgetedCategoryIds.has(c.id)),
    [state.categories, budgetedCategoryIds]
  )

  // Mes pasado con presupuesto que aún no se ha concluido (el más reciente)
  const pastMonth = useMemo(() => {
    const months = new Set(state.budgets.map((b) => b.month))
    const past = [...months].filter((m) => m < month && !state.concludedMonths.includes(m)).sort()
    return past.length > 0 ? past[past.length - 1] : null
  }, [state.budgets, state.concludedMonths, month])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Presupuesto de {formatMonthLabel(month)}
          </h2>
          <p className="text-xs text-muted-foreground">Gasto estimado por categoría este mes.</p>
        </div>
        <Button onClick={() => dialogs.openBudget()} disabled={state.categories.every((c) => c.kind !== 'expense')}>
          <PlusIcon /> Asignar presupuesto
        </Button>
      </div>

      {/* Aviso de mes anterior por concluir */}
      {pastMonth && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <RefreshIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <p className="text-sm font-bold">Tienes presupuestos de {formatMonthLabel(pastMonth)} sin concluir</p>
              <p className="text-xs text-muted-foreground">
                Al concluir, el estimado pasa a {formatMonthLabel(month)} y el sobrante (o déficit) se
                arrastra como extra.
              </p>
            </div>
          </div>
          <Button onClick={() => setConcludeOpen(true)} className="shrink-0 sm:self-center">
            Concluir {formatMonthLabel(pastMonth)}
          </Button>
        </div>
      )}

      {!stats.ratesAvailable && (
        <p className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Faltan tasas de cambio para comparar gastos en distintas monedas con el presupuesto.
        </p>
      )}

      {stats.budgetStatus.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <TargetIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No has asignado presupuestos este mes. Define un límite por categoría para controlar tus gastos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {stats.budgetStatus.map((row) => {
            const Icon = getCategoryIcon(row.categoryIcon)
            const pct = row.effectiveLimit > 0 ? Math.min(100, (row.actual / row.effectiveLimit) * 100) : 0
            const nearLimit = !row.isOver && row.ratio >= 0.8
            const cur = row.budget.currency
            return (
              <Card key={row.budget.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-bold">
                      <Icon
                        className="size-4"
                        style={row.categoryColor ? { color: row.categoryColor } : undefined}
                      />
                      {row.categoryName}
                    </span>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => dialogs.openBudget(row.budget.categoryId)}
                        aria-label="Editar presupuesto"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          removeBudget(row.budget.id)
                          notify.success('Presupuesto eliminado')
                        }}
                        aria-label="Eliminar presupuesto"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <span
                      className={cn(
                        'text-lg font-black tabular-nums',
                        row.isOver ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {formatMoney(row.actual, cur)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      de {formatMoney(row.effectiveLimit, cur)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        row.isOver ? 'bg-destructive' : nearLimit ? 'bg-amber-500' : 'bg-green-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Desglose estimado + extra arrastrado */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                    <span>Estimado: {formatMoney(row.limit, cur)}</span>
                    {row.carryover !== 0 && (
                      <span className={cn(row.carryover < 0 && 'text-destructive')}>
                        Extra: {row.carryover > 0 ? '+' : ''}
                        {formatMoney(row.carryover, cur)}
                      </span>
                    )}
                  </div>

                  {row.isOver && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                      <AlertIcon className="size-3.5" />
                      Superaste el presupuesto en {formatMoney(row.actual - row.effectiveLimit, cur)}
                    </p>
                  )}
                  {nearLimit && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                      Cerca del límite ({Math.round(row.ratio * 100)}%)
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {unbudgeted.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sin presupuesto
          </h3>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map((c) => {
              const Icon = getCategoryIcon(c.icon)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => dialogs.openBudget(c.id)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {c.name}
                  <PlusIcon className="size-3.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Metas / Alcancías */}
      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Metas de ahorro
            </h2>
            <p className="text-xs text-muted-foreground">
              Alcancías para tus objetivos. No dependen del mes.
            </p>
          </div>
          <Button onClick={() => setGoalForm({ open: true, editing: null })}>
            <PlusIcon /> Nueva meta
          </Button>
        </div>

        {state.goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <TargetIcon className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Crea una meta (fondo de emergencia, un carro…) y mueve dinero de tus cuentas hacia
                ella.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.goals.map((goal) => {
              const saved = goalBalanceById.get(goal.id) ?? 0
              const target = parseFloat(String(goal.target ?? '0').replace(',', '.')) || 0
              const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0
              const accent = goal.color ?? DEFAULT_ACCOUNT_COLOR
              const GoalIcon = getAccountIcon(goal.icon)
              return (
                <Card
                  key={goal.id}
                  style={{
                    boxShadow: `0 0 0 2px color-mix(in oklch, ${accent} 40%, transparent)`,
                  }}
                >
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                            color: accent,
                          }}
                        >
                          <GoalIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{goal.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {target > 0
                              ? `${formatMoney(saved, goal.currency)} de ${formatMoney(target, goal.currency)}`
                              : formatMoney(saved, goal.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setGoalForm({ open: true, editing: goal })}
                          aria-label="Editar meta"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDeleteGoal(goal)}
                          aria-label="Eliminar meta"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {target > 0 && (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: accent }}
                        />
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 self-start"
                      onClick={() => setContributionGoal(goal)}
                    >
                      <TransferIcon className="size-4" /> Mover dinero
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Listas de compras */}
      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Listas de compras
            </h2>
            <p className="text-xs text-muted-foreground">
              Planifica tus compras y márcalas al pagarlas con una de tus cuentas.
            </p>
          </div>
          <Button onClick={() => setListForm({ open: true, editing: null })}>
            <PlusIcon /> Nueva lista
          </Button>
        </div>

        {state.shoppingLists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <ShoppingCartIcon className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Crea una lista (mercado, ferretería…), agrega productos con su precio y márcalos
                como comprados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.shoppingLists.map((list) => {
              const listItems = itemsByList.get(list.id) ?? []
              const purchased = listItems.filter((it) => it.purchased).length
              const accent = list.color ?? DEFAULT_ACCOUNT_COLOR
              const ListIcon = getAccountIcon(list.icon)
              return (
                <Card
                  key={list.id}
                  style={{
                    boxShadow: `0 0 0 2px color-mix(in oklch, ${accent} 40%, transparent)`,
                  }}
                >
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailListId(list.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                            color: accent,
                          }}
                        >
                          <ListIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{list.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {listItems.length === 0
                              ? 'Sin productos'
                              : `${purchased} de ${listItems.length} comprados`}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDeleteList(list)}
                        aria-label="Eliminar lista"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>

                    {listItems.length > 0 && (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (purchased / listItems.length) * 100)}%`,
                            backgroundColor: accent,
                          }}
                        />
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 self-start"
                      onClick={() => setDetailListId(list.id)}
                    >
                      <ShoppingCartIcon className="size-4" /> Ver productos
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <ConcludeMonthDialog
        open={concludeOpen}
        onOpenChange={setConcludeOpen}
        wallet={wallet}
        rates={rates}
        fromMonth={pastMonth}
        toMonth={month}
      />

      <GoalFormDialog
        open={goalForm.open}
        onOpenChange={(open) => setGoalForm((s) => ({ ...s, open }))}
        wallet={wallet}
        editing={goalForm.editing}
      />

      <GoalContributionDialog
        open={!!contributionGoal}
        onOpenChange={(o) => !o && setContributionGoal(null)}
        wallet={wallet}
        goal={contributionGoal}
      />

      <AlertDialog
        open={!!pendingDeleteGoal}
        onOpenChange={(o) => !o && setPendingDeleteGoal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar meta</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeleteGoal?.name}» y su historial de aportes. El dinero ya
              retirado a tus cuentas no se ve afectado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteGoal) {
                  removeGoal(pendingDeleteGoal.id)
                  notify.success('Meta eliminada')
                }
                setPendingDeleteGoal(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShoppingListFormDialog
        open={listForm.open}
        onOpenChange={(open) => setListForm((s) => ({ ...s, open }))}
        wallet={wallet}
        editing={listForm.editing}
      />

      <ShoppingListDetailDialog
        open={!!detailList}
        onOpenChange={(o) => !o && setDetailListId(null)}
        wallet={wallet}
        list={detailList}
        rates={rates}
        onAddItem={(listId) => setItemForm({ open: true, listId, editing: null })}
        onEditList={(list) => setListForm({ open: true, editing: list })}
        onPurchase={(item) => setPurchaseItem(item)}
        onOpenItem={(item) => setItemDetailId(item.id)}
      />

      <ShoppingItemDetailDialog
        open={!!itemDetail}
        onOpenChange={(o) => !o && setItemDetailId(null)}
        wallet={wallet}
        item={itemDetail}
        onEdit={(item) => {
          setItemDetailId(null)
          setItemForm({ open: true, listId: item.listId, editing: item })
        }}
      />

      <ShoppingItemFormDialog
        open={itemForm.open}
        onOpenChange={(open) => setItemForm((s) => ({ ...s, open }))}
        wallet={wallet}
        listId={itemForm.listId}
        editing={itemForm.editing}
      />

      <ConfirmPurchaseDialog
        open={!!purchaseItem}
        onOpenChange={(o) => !o && setPurchaseItem(null)}
        wallet={wallet}
        item={purchaseItem}
        rates={rates}
      />

      <AlertDialog
        open={!!pendingDeleteList}
        onOpenChange={(o) => !o && setPendingDeleteList(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lista</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeleteList?.name}» y todos sus productos. Los gastos ya
              registrados de sus compras también se eliminarán de tus movimientos. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteList) {
                  removeShoppingList(pendingDeleteList.id)
                  notify.success('Lista eliminada')
                }
                setPendingDeleteList(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
