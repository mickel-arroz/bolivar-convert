/**
 * Paleta de colores personalizables para cuentas y categorías. Los valores son
 * variables CSS definidas en globals.css (`:root` y `.dark`), por lo que se
 * adaptan automáticamente a modo claro y oscuro (regla 3 del proyecto).
 */
export const WALLET_COLORS = [
  'var(--wallet-red)',
  'var(--wallet-orange)',
  'var(--wallet-amber)',
  'var(--wallet-green)',
  'var(--wallet-teal)',
  'var(--wallet-blue)',
  'var(--wallet-indigo)',
  'var(--wallet-purple)',
  'var(--wallet-pink)',
] as const

/**
 * Color por defecto (gris) cuando el usuario no elige ninguno. Variable propia, no
 * `--muted-foreground`: en modo oscuro tiene un gris más claro para que se lea sobre el
 * fondo, y en claro vale lo mismo que antes.
 */
export const DEFAULT_ACCOUNT_COLOR = 'var(--wallet-gray)'

/** El gris por defecto de antes: categorías guardadas con él se siguen leyendo como «sin color». */
const LEGACY_DEFAULT_COLOR = 'var(--muted-foreground)'

export const isDefaultColor = (value: string | undefined): boolean =>
  !value || value === DEFAULT_ACCOUNT_COLOR || value === LEGACY_DEFAULT_COLOR
