import { Account, Transaction, TransactionType } from '@/hooks/useWallet'

/** Controladores para abrir los distintos diálogos de la billetera (gestionados en el root). */
export interface WalletDialogs {
  openNewAccount: () => void
  openEditAccount: (account: Account) => void
  openNewTransaction: (type?: TransactionType) => void
  openEditTransaction: (tx: Transaction) => void
  openTransfer: () => void
  openCategories: () => void
  openBudget: (categoryId?: string) => void
}
