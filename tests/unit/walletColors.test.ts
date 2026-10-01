import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { DEFAULT_ACCOUNT_COLOR, isDefaultColor } from '@/constants/walletColors'
import { DEFAULT_CATEGORIES } from '@/constants/walletCategories'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

/** Luminosidad (L de oklch) de una variable dentro de un bloque `:root` o `.dark`. */
function lightness(block: ':root' | '.dark', variable: string): number {
  const start = css.indexOf(block === ':root' ? ':root {' : '.dark {')
  const end = css.indexOf('\n}', start)
  const body = css.slice(start, end)
  const m = body.match(new RegExp(`${variable}:\\s*oklch\\(([\\d.]+)`))
  if (!m) throw new Error(`${variable} no está definida en ${block}`)
  return parseFloat(m[1])
}

describe('gris de «Compras» y gris por defecto', () => {
  it('«Compras» usa --chart-4, que en modo oscuro es un gris claro y se lee sobre el fondo', () => {
    expect(DEFAULT_CATEGORIES.find((c) => c.id === 'cat_shopping')?.color).toBe('var(--chart-4)')

    const darkBackground = lightness('.dark', '--background')
    expect(lightness('.dark', '--chart-4')).toBeGreaterThan(0.7)
    // Contraste claro con el fondo y con las tarjetas del modo oscuro.
    expect(lightness('.dark', '--chart-4') - darkBackground).toBeGreaterThan(0.5)
    expect(lightness('.dark', '--chart-4') - lightness('.dark', '--card')).toBeGreaterThan(0.5)
  })

  it('en modo claro los dos grises quedan como estaban', () => {
    expect(lightness(':root', '--chart-4')).toBe(0.371)
    expect(lightness(':root', '--wallet-gray')).toBe(lightness(':root', '--muted-foreground'))
  })

  it('el gris por defecto es más claro en oscuro que en claro', () => {
    expect(lightness('.dark', '--wallet-gray')).toBeGreaterThan(lightness(':root', '--wallet-gray'))
  })

  it('el gris por defecto usa su variable propia', () => {
    expect(DEFAULT_ACCOUNT_COLOR).toBe('var(--wallet-gray)')
  })

  it('reconoce como «sin color» tanto el gris nuevo como el anterior ya guardado', () => {
    expect(isDefaultColor(undefined)).toBe(true)
    expect(isDefaultColor('var(--wallet-gray)')).toBe(true)
    expect(isDefaultColor('var(--muted-foreground)')).toBe(true)
    expect(isDefaultColor('var(--wallet-red)')).toBe(false)
  })
})
