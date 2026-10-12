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
  TargetIcon,
  ChartPieIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@/components/icons'
import type { Category, TransactionType } from '@/hooks/useWallet'

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
  savings: TargetIcon,
  investment: ChartPieIcon,
  growth: TrendingUpIcon,
  insurance: ShieldCheckIcon,
  subscription: ClockIcon,
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
  savings: TargetIcon,
  investment: ChartPieIcon,
  growth: TrendingUpIcon,
  insurance: ShieldCheckIcon,
  subscription: ClockIcon,
}

/** Claves disponibles para que el usuario elija el icono de una cuenta. */
export const ACCOUNT_ICON_KEYS = Object.keys(ACCOUNT_ICON_MAP)

/** Resuelve el componente de icono de una cuenta (fallback: WalletIcon). */
export function getAccountIcon(iconKey: string | undefined): SvgIcon {
  return (iconKey && ACCOUNT_ICON_MAP[iconKey]) || WalletIcon
}

/**
 * «Otros» de cada tipo: recibe lo que el usuario no clasificó y es la categoría con
 * la que arranca un movimiento nuevo.
 */
export const OTHER_CATEGORY_IDS: Readonly<Record<TransactionType, string>> = {
  expense: 'cat_other_exp',
  income: 'cat_other_inc',
}

/**
 * Categorías que el usuario no ve en sus listados. Solo aparecen donde ya hay datos
 * que las usan (movimientos, historial). «Compras» es el destino por defecto de una
 * compra sin categoría (`confirmPurchase`), así que tiene que existir siempre.
 */
const HIDDEN_CATEGORY_IDS: readonly string[] = ['cat_shopping']

/**
 * Categorías del sistema: no se editan ni se borran, y se vuelven a sembrar aunque
 * el usuario las hubiera borrado antes de serlo.
 */
export const SYSTEM_CATEGORY_IDS: readonly string[] = [
  ...HIDDEN_CATEGORY_IDS,
  ...Object.values(OTHER_CATEGORY_IDS),
]

export const isSystemCategory = (id: string | undefined): boolean =>
  !!id && SYSTEM_CATEGORY_IDS.includes(id)

/**
 * Categorías que el usuario puede ver y elegir. `keep` conserva una categoría oculta
 * que ya está en uso (p. ej. al editar un movimiento que ya la tiene).
 */
export function userCategories<T extends { id: string }>(categories: T[], keep?: string): T[] {
  return categories.filter((c) => !HIDDEN_CATEGORY_IDS.includes(c.id) || c.id === keep)
}

/** El «Otros» de gasto no admite presupuesto. */
export const admitsBudget = (categoryId: string): boolean =>
  categoryId !== OTHER_CATEGORY_IDS.expense

/** Categorías de gasto que admiten presupuesto. */
export function budgetableCategories<T extends { id: string; kind: TransactionType }>(
  categories: T[],
  keep?: string
): T[] {
  return userCategories(categories, keep).filter(
    (c) => c.kind === 'expense' && admitsBudget(c.id)
  )
}

/**
 * Categoría con la que arranca el formulario de un movimiento: «Otros» de su tipo,
 * o vacía si no existe.
 */
export function initialCategoryId(categories: Category[], type: TransactionType): string {
  const other = OTHER_CATEGORY_IDS[type]
  return categories.some((c) => c.id === other && c.kind === type) ? other : ''
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
