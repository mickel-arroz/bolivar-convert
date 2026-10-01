import type { CurrencyId } from '@/constants/currencies'
import type { Rates } from '@/constants/rates'

/** Una conversión del saldo de una cuenta a otra moneda, con la fuente de la tasa usada. */
export interface AccountConversion {
  currency: CurrencyId
  source: 'BCV' | 'Binance'
  value: number
}

/** Tasa como número; 0 si falta o no es válida (en cuyo caso esa conversión no se ofrece). */
function rate(r: string | undefined): number {
  const n = parseFloat(r ?? '')
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * A qué monedas se convierte el saldo de una cuenta, según su moneda:
 * - Bolívares: a dólares y euros con BCV, y a dólares con Binance.
 * - Dólares: a bolívares con BCV y con Binance.
 * - Euros: a dólares con BCV y a bolívares con la tasa del euro (BCV).
 *
 * Una conversión cuya tasa falta se omite en vez de mostrarse en cero.
 */
export function accountConversions(
  amount: number,
  currency: CurrencyId,
  rates: Rates
): AccountConversion[] {
  const usd = rate(rates.bcvUsd)
  const eur = rate(rates.bcvEur)
  const binance = rate(rates.binanceUsdAvg)
  const out: AccountConversion[] = []

  if (currency === 'VES') {
    if (usd) out.push({ currency: 'USD', source: 'BCV', value: amount / usd })
    if (eur) out.push({ currency: 'EUR', source: 'BCV', value: amount / eur })
    if (binance) out.push({ currency: 'USD', source: 'Binance', value: amount / binance })
  } else if (currency === 'USD') {
    if (usd) out.push({ currency: 'VES', source: 'BCV', value: amount * usd })
    if (binance) out.push({ currency: 'VES', source: 'Binance', value: amount * binance })
  } else {
    if (usd && eur) out.push({ currency: 'USD', source: 'BCV', value: (amount * eur) / usd })
    if (eur) out.push({ currency: 'VES', source: 'BCV', value: amount * eur })
  }
  return out
}
