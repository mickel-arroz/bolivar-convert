import { describe, it, expect } from 'vitest'
import { filterShoppingItems } from '@/lib/wallet/shoppingSearch'

const items = [
  { id: '1', title: 'Café molido', description: 'Paquete de 500 g' },
  { id: '2', title: 'Arroz', description: 'Para la semana' },
  { id: '3', title: 'Jabón', description: undefined },
]

const ids = (q: string) => filterShoppingItems(items, q).map((it) => it.id)

describe('filterShoppingItems', () => {
  it('sin búsqueda devuelve todos los productos', () => {
    expect(ids('')).toEqual(['1', '2', '3'])
    expect(ids('   ')).toEqual(['1', '2', '3'])
  })

  it('coincide por fragmento del título', () => {
    expect(ids('rro')).toEqual(['2'])
  })

  it('coincide por fragmento de la descripción', () => {
    expect(ids('semana')).toEqual(['2'])
  })

  it('no distingue mayúsculas', () => {
    expect(ids('ARROZ')).toEqual(['2'])
  })

  it('no distingue acentos en ninguna dirección', () => {
    expect(ids('cafe')).toEqual(['1'])
    expect(ids('jabon')).toEqual(['3'])
    expect(ids('arróz')).toEqual(['2'])
  })

  it('ignora espacios alrededor de la búsqueda', () => {
    expect(ids('  cafe ')).toEqual(['1'])
  })

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(ids('leche')).toEqual([])
  })
})
