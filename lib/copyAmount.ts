/**
 * Monto formateado listo para pegar: sin separadores de miles ni espacios, con su
 * separador decimal original ('6.582.892,00' → '6582892,00', '1,234.56' → '1234.56').
 * El decimal es el último separador seguido de 1 o 2 dígitos al final; un grupo de
 * 3 dígitos es de miles.
 */
export function toCopyableAmount(formatted: string): string {
  const clean = formatted.replace(/[\s ]/g, '')
  const decimal = clean.match(/([.,])(\d{1,2})$/)
  if (!decimal) return clean.replace(/[.,]/g, '')
  const integer = clean.slice(0, -decimal[0].length).replace(/[.,]/g, '')
  return `${integer}${decimal[1]}${decimal[2]}`
}
