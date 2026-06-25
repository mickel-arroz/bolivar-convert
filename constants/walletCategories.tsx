import { ComponentProps, ComponentType } from 'react'
import {
  ForkKnifeIcon,
  CarIcon,
  BoltIcon,
  HeartIcon,
  BriefcaseIcon,
  GiftIcon,
  DotsIcon,
  ShoppingCartIcon,
  HomeIcon,
  CoinIcon,
  WalletIcon,
  LandmarkIcon,
  DollarIcon,
  EuroIcon,
  BinanceIcon,
} from '@/components/icons'
import type { Category } from '@/hooks/useWallet'

type SvgIcon = ComponentType<ComponentProps<'svg'>>

/**
 * Mapa de claves de icono → componente SVG aislado (regla del proyecto: nada de
 * <svg> inline). Las categorías guardan solo la clave string; la UI resuelve el
 * componente a través de este mapa.
 */
export const CATEGORY_ICON_MAP: Record<string, SvgIcon> = {
  food: ForkKnifeIcon,
  transport: CarIcon,
  services: BoltIcon,
  health: HeartIcon,
  shopping: ShoppingCartIcon,
  home: HomeIcon,
  salary: BriefcaseIcon,
  remittance: GiftIcon,
  coin: CoinIcon,
  other: DotsIcon,
}

/** Claves disponibles para que el usuario elija al crear una categoría. */
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICON_MAP)

/** Resuelve el componente de icono de una categoría (fallback: DotsIcon). */
export function getCategoryIcon(iconKey: string): SvgIcon {
  return CATEGORY_ICON_MAP[iconKey] ?? DotsIcon
}

/**
 * Mapa de claves de icono para CUENTAS. Los iconos se pueden reutilizar libremente
 * entre cuentas (una misma clave puede usarse en varias).
 */
export const ACCOUNT_ICON_MAP: Record<string, SvgIcon> = {
  wallet: WalletIcon,
  bank: LandmarkIcon,
  cash: CoinIcon,
  dollar: DollarIcon,
  euro: EuroIcon,
  binance: BinanceIcon,
  card: BriefcaseIcon,
  home: HomeIcon,
  gift: GiftIcon,
  shopping: ShoppingCartIcon,
}

/** Claves disponibles para que el usuario elija el icono de una cuenta. */
export const ACCOUNT_ICON_KEYS = Object.keys(ACCOUNT_ICON_MAP)

/** Resuelve el componente de icono de una cuenta (fallback: WalletIcon). */
export function getAccountIcon(iconKey: string | undefined): SvgIcon {
  return (iconKey && ACCOUNT_ICON_MAP[iconKey]) || WalletIcon
}

/**
 * Categorías sembradas en la primera carga. IDs fijos (no generateId) para que
 * el sembrado sea idempotente entre recargas y los presupuestos/transacciones
 * que las referencian se mantengan estables.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // Gastos
  { id: 'cat_food', name: 'Comida', kind: 'expense', icon: 'food', color: 'var(--rate-binance)', isDefault: true },
  { id: 'cat_transport', name: 'Transporte', kind: 'expense', icon: 'transport', color: 'var(--rate-eur)', isDefault: true },
  { id: 'cat_services', name: 'Servicios', kind: 'expense', icon: 'services', color: 'var(--rate-usd)', isDefault: true },
  { id: 'cat_shopping', name: 'Compras', kind: 'expense', icon: 'shopping', color: 'var(--chart-4)', isDefault: true },
  { id: 'cat_health', name: 'Salud', kind: 'expense', icon: 'health', color: '#ef4444', isDefault: true },
  { id: 'cat_other_exp', name: 'Otros', kind: 'expense', icon: 'other', color: 'var(--muted-foreground)', isDefault: true },
  // Ingresos
  { id: 'cat_salary', name: 'Salario', kind: 'income', icon: 'salary', color: 'var(--rate-usd)', isDefault: true },
  { id: 'cat_remittance', name: 'Remesas', kind: 'income', icon: 'remittance', color: 'var(--rate-eur)', isDefault: true },
  { id: 'cat_other_inc', name: 'Otros', kind: 'income', icon: 'coin', color: 'var(--rate-binance)', isDefault: true },
]
