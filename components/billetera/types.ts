import { useWallet } from '@/hooks/useWallet'

/** API completa del hook useWallet, para tipar props de los componentes hijos. */
export type WalletApi = ReturnType<typeof useWallet>

export type WalletTab = 'resumen' | 'movimientos' | 'estadisticas' | 'presupuesto'
