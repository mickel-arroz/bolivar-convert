'use client'

import { useMemo, useState } from 'react'
import { useWallet, Account, Transaction, TransactionType } from '@/hooks/useWallet'
import { useRates } from '@/hooks/useRates'
import { SectionHeader } from '@/components/SectionHeader'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/components/ui/tabs'
import { WalletIcon, ListIcon, ChartPieIcon, TargetIcon, AlertIcon } from '@/components/icons'
import { MigrationPrompt } from './MigrationPrompt'
import { WalletTab } from './types'
import { WalletDialogs } from './dialogs'
import { ResumenTab } from './ResumenTab'
import { MovimientosTab } from './MovimientosTab'
import { EstadisticasTab } from './EstadisticasTab'
import { PresupuestoTab } from './PresupuestoTab'
import { AccountFormDialog } from './AccountFormDialog'
import { TransactionFormDialog } from './TransactionFormDialog'
import { TransferFormDialog } from './TransferFormDialog'
import { CategoryManagerDialog } from './CategoryManagerDialog'
import { BudgetFormDialog } from './BudgetFormDialog'

export function Billetera() {
  const wallet = useWallet()
  const { rates } = useRates()
  const [activeTab, setActiveTab] = useState<WalletTab>('resumen')

  const { computeStats } = wallet
  const stats = useMemo(() => computeStats(rates), [computeStats, rates])

  // Estado de los diálogos
  const [accountDialog, setAccountDialog] = useState<{ open: boolean; editing: Account | null }>({
    open: false,
    editing: null,
  })
  const [txDialog, setTxDialog] = useState<{
    open: boolean
    editing: Transaction | null
    type: TransactionType
  }>({ open: false, editing: null, type: 'expense' })
  const [transferOpen, setTransferOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [budgetDialog, setBudgetDialog] = useState<{ open: boolean; presetCategoryId: string | null }>({
    open: false,
    presetCategoryId: null,
  })

  const dialogs = useMemo<WalletDialogs>(
    () => ({
      openNewAccount: () => setAccountDialog({ open: true, editing: null }),
      openEditAccount: (account) => setAccountDialog({ open: true, editing: account }),
      openNewTransaction: (type = 'expense') => setTxDialog({ open: true, editing: null, type }),
      openEditTransaction: (tx) => setTxDialog({ open: true, editing: tx, type: tx.type }),
      openTransfer: () => setTransferOpen(true),
      openCategories: () => setCategoriesOpen(true),
      openBudget: (categoryId) => setBudgetDialog({ open: true, presetCategoryId: categoryId ?? null }),
    }),
    []
  )

  return (
    <div className="flex flex-col gap-8 pb-2 animate-in fade-in duration-500">
      <SectionHeader
        title="Billetera"
        description="Gestiona tus cuentas, gastos e ingresos en bolívares, dólares y euros."
      />

      {wallet.isMounted && <MigrationPrompt cloudHasData={wallet.hasData} />}

      {wallet.loadError && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertIcon className="size-4 shrink-0" />
          No se pudieron cargar tus datos de la nube. Revisa tu conexión y recarga la página.
        </p>
      )}
      {wallet.syncError && !wallet.loadError && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertIcon className="size-4 shrink-0" />
          Algunos cambios no se guardaron en la nube. Se reintentará con tu próxima acción.
        </p>
      )}

      {!wallet.isMounted ? (
        <div className="flex justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WalletTab)}>
          <TabsList>
            <TabsTab value="resumen">
              <WalletIcon className="size-4" /> <span className="hidden sm:inline">Resumen</span>
            </TabsTab>
            <TabsTab value="movimientos">
              <ListIcon className="size-4" /> <span className="hidden sm:inline">Movimientos</span>
            </TabsTab>
            <TabsTab value="estadisticas">
              <ChartPieIcon className="size-4" /> <span className="hidden sm:inline">Estadísticas</span>
            </TabsTab>
            <TabsTab value="presupuesto">
              <TargetIcon className="size-4" /> <span className="hidden sm:inline">Presupuesto</span>
            </TabsTab>
          </TabsList>

          <TabsPanel value="resumen">
            <ResumenTab wallet={wallet} rates={rates} dialogs={dialogs} />
          </TabsPanel>
          <TabsPanel value="movimientos">
            <MovimientosTab wallet={wallet} dialogs={dialogs} />
          </TabsPanel>
          <TabsPanel value="estadisticas">
            <EstadisticasTab wallet={wallet} stats={stats} />
          </TabsPanel>
          <TabsPanel value="presupuesto">
            <PresupuestoTab wallet={wallet} stats={stats} dialogs={dialogs} rates={rates} />
          </TabsPanel>
        </Tabs>
      )}

      {/* Diálogos */}
      <AccountFormDialog
        open={accountDialog.open}
        onOpenChange={(open) => setAccountDialog((d) => ({ ...d, open }))}
        wallet={wallet}
        editing={accountDialog.editing}
      />
      <TransactionFormDialog
        open={txDialog.open}
        onOpenChange={(open) => setTxDialog((d) => ({ ...d, open }))}
        wallet={wallet}
        editing={txDialog.editing}
        defaultType={txDialog.type}
      />
      <TransferFormDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        wallet={wallet}
        rates={rates}
      />
      <CategoryManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} wallet={wallet} />
      <BudgetFormDialog
        open={budgetDialog.open}
        onOpenChange={(open) => setBudgetDialog((d) => ({ ...d, open }))}
        wallet={wallet}
        presetCategoryId={budgetDialog.presetCategoryId}
      />
    </div>
  )
}
