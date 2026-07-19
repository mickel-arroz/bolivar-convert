'use client'

import { useMemo, useState } from 'react'
import { WalletApi } from '@/hooks/useWallet'
import { useWalletResource } from '@/hooks/useWalletResource'
import type { MovementsPage } from '@/lib/wallet/compute'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusIcon, TransferIcon, ListIcon, LayoutIcon, ChevronRightIcon } from '@/components/icons'
import { notify } from '@/lib/notify'
import { WalletDialogs } from './dialogs'
import { MovementRow } from './MovementRow'
import { MovementListSkeleton } from './skeletons'

interface MovimientosTabProps {
  wallet: WalletApi
  dialogs: WalletDialogs
}

export function MovimientosTab({ wallet, dialogs }: MovimientosTabProps) {
  const { state, removeTransaction, removeTransfer } = wallet
  const [page, setPage] = useState(1)

  const accountById = useMemo(() => new Map(state.accounts.map((a) => [a.id, a])), [state.accounts])
  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )

  const { data, error } = useWalletResource<MovementsPage>(
    `/api/wallet/movements?page=${page}`,
    wallet.syncedVersion
  )

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const currentPage = data?.page ?? page

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => dialogs.openNewTransaction('expense')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Gasto
        </Button>
        <Button
          variant="outline"
          onClick={() => dialogs.openNewTransaction('income')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Ingreso
        </Button>
        <Button variant="outline" onClick={dialogs.openTransfer} disabled={state.accounts.length < 2}>
          <TransferIcon /> Traspaso
        </Button>
        <Button variant="ghost" onClick={dialogs.openCategories} className="md:ml-auto">
          <LayoutIcon /> Categorías
        </Button>
      </div>

      {!data ? (
        <MovementListSkeleton rows={8} />
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            No se pudieron cargar los movimientos. Intenta de nuevo.
          </CardContent>
        </Card>
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
              onDeleteTx={(id) => {
                removeTransaction(id)
                notify.success('Movimiento eliminado')
              }}
              onDeleteTransfer={(id) => {
                removeTransfer(id)
                notify.success('Traspaso eliminado')
              }}
            />
          ))}

          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
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
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Más antiguos <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
