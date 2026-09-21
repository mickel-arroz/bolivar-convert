import { CURRENCIES, type CurrencyId } from '@/constants/currencies'

/** Moneda de visualización de fábrica: la que ve un usuario que nunca eligió una. */
export const DEFAULT_DISPLAY_CURRENCY: CurrencyId = 'USD'

/** Clave de localStorage donde la moneda de patrimonio vivía antes de mudarse al perfil. */
export const LEGACY_NETWORTH_CURRENCY_KEY = 'bolivar_networth_currency_v1'

interface LegacyStorage {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
}

/** Lee la moneda de patrimonio que las versiones pre-nube guardaban en localStorage. */
export function readLegacyNetWorthCurrency(storage: Pick<LegacyStorage, 'getItem'>): CurrencyId | null {
  try {
    const saved = storage.getItem(LEGACY_NETWORTH_CURRENCY_KEY)
    return isCurrencyId(saved) ? saved : null
  } catch {
    return null
  }
}

/** Borra la clave legada. Se llama solo cuando el valor ya está a salvo en la nube. */
export function clearLegacyNetWorthCurrency(storage: Pick<LegacyStorage, 'removeItem'>): void {
  try {
    storage.removeItem(LEGACY_NETWORTH_CURRENCY_KEY)
  } catch {
    /* el navegador puede bloquear el storage; se reintenta en la próxima sesión */
  }
}

export function isCurrencyId(value: unknown): value is CurrencyId {
  return CURRENCIES.some((c) => c.id === value)
}

/** La moneda que muestra un bloque: su override, o la preferencia si no tiene. */
export function resolveDisplayCurrency(
  override: CurrencyId | null | undefined,
  preference: CurrencyId
): CurrencyId {
  if (isCurrencyId(override)) return override
  if (isCurrencyId(preference)) return preference
  return DEFAULT_DISPLAY_CURRENCY
}

/** Elegir la preferencia borra el override, para que el bloque la siga si cambia. */
export function nextOverride(
  selected: CurrencyId,
  preference: CurrencyId
): CurrencyId | undefined {
  return selected === preference ? undefined : selected
}

