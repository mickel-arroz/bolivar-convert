'use client'

import { useMemo, useRef, useState } from 'react'
import { Rates } from '@/constants/rates'
import { WalletApi } from '@/hooks/useWallet'
import { useWalletResource } from '@/hooks/useWalletResource'
import type { MovementsPage } from '@/lib/wallet/compute'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusIcon, TransferIcon, ListIcon, LayoutIcon, ChevronRightIcon } from '@/components/icons'
import { WalletDialogs } from './dialogs'
import { MovementRow } from './MovementRow'
import { MovementListSkeleton } from './skeletons'
import { DeleteMovementDialog, DeleteTarget } from './DeleteMovementDialog'

interface MovementsSectionProps {
  wallet: WalletApi
  dialogs: WalletDialogs
  rates: Rates
}

export function MovementsSection({ wallet, dialogs, rates }: MovementsSectionProps) {
  const { state } = wallet
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const accountById = useMemo(() => new Map(state.accounts.map((a) => [a.id, a])), [state.accounts])
  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )
  const goalById = useMemo(() => new Map(state.goals.map((g) => [g.id, g])), [state.goals])

  const { data, error } = useWalletResource<MovementsPage>(
    `/api/wallet/movements?page=${page}`,
    wallet.syncedVersion
  )

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const currentPage = data?.page ?? page

  const goToPage = (next: number) => {
    setPage(next)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section ref={sectionRef} className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Movimientos
        </h2>
        <Button
          size="sm"
          onClick={() => dialogs.openNewTransaction('expense')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Gasto
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dialogs.openNewTransaction('income')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Ingreso
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={dialogs.openTransfer}
          disabled={state.accounts.length < 2}
        >
          <TransferIcon /> Traspaso
        </Button>
        <Button size="sm" variant="ghost" onClick={dialogs.openCategories}>
          <LayoutIcon /> Categorías
        </Button>
      </div>

      {error && !data ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            No se pudieron cargar los movimientos. Intenta de nuevo.
          </CardContent>
        </Card>
      ) : !data ? (
        <MovementListSkeleton rows={4} />
      ) : total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ListIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No hay movimientos todavía. Registra un ingreso, gasto o traspaso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <MovementRow
              key={item.id}
              item={item}
              accountById={accountById}
              categoryById={categoryById}
              onEditTx={(id) => {
                const tx = state.transactions.find((t) => t.id === id)
                if (tx) dialogs.openEditTransaction(tx)
              }}
              onDeleteTx={(id) => setPendingDelete({ kind: 'tx', id })}
              onDeleteTransfer={(id) => setPendingDelete({ kind: 'transfer', id })}
              goalById={goalById}
              onEditGoalMovement={dialogs.openEditGoalMovement}
              onDeleteGoalMovement={(id) => setPendingDelete({ kind: 'goalMovement', id })}
            />
          ))}

          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronRightIcon className="size-4 rotate-180" /> Recientes
              </Button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Página {currentPage} de {totalPages} · {total} movimientos
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Más antiguos <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <DeleteMovementDialog
        target={pendingDelete}
        onClose={() => setPendingDelete(null)}
        wallet={wallet}
        rates={rates}
      />
    </section>
  )
}
