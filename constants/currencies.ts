export const CURRENCIES = [
  { id: 'VES', label: 'Bolívares', symbol: 'Bs.' },
  { id: 'USD', label: 'Dólar', symbol: '$' },
  { id: 'EUR', label: 'Euro', symbol: '€' },
] as const

export type CurrencyId = (typeof CURRENCIES)[number]['id']

export function getCurrency(id: CurrencyId) {
  return CURRENCIES.find((c) => c.id === id) ?? CURRENCIES[0]
}
