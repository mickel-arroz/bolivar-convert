import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CATEGORIES,
  OTHER_CATEGORY_IDS,
  budgetableCategories,
  initialCategoryId,
  isSystemCategory,
  userCategories,
} from '@/constants/walletCategories'
import { mergeCategories } from '@/hooks/useWallet'
import type { Category } from '@/hooks/useWallet'

const custom: Category = { id: 'cat_custom', name: 'Mascotas', kind: 'expense', icon: 'other' }

describe('categorías de sistema', () => {
  it('«Compras» y las dos «Otros» son de sistema; las demás no', () => {
    expect(isSystemCategory('cat_shopping')).toBe(true)
    expect(isSystemCategory(OTHER_CATEGORY_IDS.expense)).toBe(true)
    expect(isSystemCategory(OTHER_CATEGORY_IDS.income)).toBe(true)
    expect(isSystemCategory('cat_food')).toBe(false)
    expect(isSystemCategory(undefined)).toBe(false)
  })

  it('«Otros» es visible para el usuario; «Compras» no', () => {
    const ids = userCategories(DEFAULT_CATEGORIES).map((c) => c.id)
    expect(ids).toContain(OTHER_CATEGORY_IDS.expense)
    expect(ids).toContain(OTHER_CATEGORY_IDS.income)
    expect(ids).not.toContain('cat_shopping')
  })

  it('el «Otros» de gasto no admite presupuesto', () => {
    const ids = budgetableCategories([...DEFAULT_CATEGORIES, custom]).map((c) => c.id)
    expect(ids).not.toContain(OTHER_CATEGORY_IDS.expense)
    expect(ids).not.toContain('cat_shopping')
    expect(ids).not.toContain(OTHER_CATEGORY_IDS.income)
    expect(ids).toContain('cat_food')
    expect(ids).toContain('cat_custom')
  })

  it('«Otros» vuelve aunque el usuario la hubiera borrado', () => {
    const stored = DEFAULT_CATEGORIES.filter((c) => !c.id.startsWith('cat_other'))
    const merged = mergeCategories(stored, [OTHER_CATEGORY_IDS.expense, OTHER_CATEGORY_IDS.income])
    expect(merged.find((c) => c.id === OTHER_CATEGORY_IDS.expense)?.name).toBe('Otros')
    expect(merged.find((c) => c.id === OTHER_CATEGORY_IDS.income)?.name).toBe('Otros')
  })

  it('«Otros» vuelve aunque no haya nada guardado y tenga lápida', () => {
    const merged = mergeCategories([], [OTHER_CATEGORY_IDS.expense, 'cat_food'])
    expect(merged.some((c) => c.id === OTHER_CATEGORY_IDS.expense)).toBe(true)
    expect(merged.some((c) => c.id === 'cat_food')).toBe(false)
  })

  it('«Otros» renombrada vuelve a llamarse «Otros»', () => {
    const stored = DEFAULT_CATEGORIES.map((c) =>
      c.id === OTHER_CATEGORY_IDS.expense ? { ...c, name: 'Varios' } : c
    )
    const merged = mergeCategories(stored)
    expect(merged.find((c) => c.id === OTHER_CATEGORY_IDS.expense)?.name).toBe('Otros')
  })
})

describe('categoría preseleccionada', () => {
  it('un movimiento nuevo arranca en «Otros» de su tipo', () => {
    expect(initialCategoryId(DEFAULT_CATEGORIES, 'expense')).toBe(OTHER_CATEGORY_IDS.expense)
    expect(initialCategoryId(DEFAULT_CATEGORIES, 'income')).toBe(OTHER_CATEGORY_IDS.income)
  })

  it('sin «Otros» disponible queda vacía', () => {
    const noOther = DEFAULT_CATEGORIES.filter((c) => c.id !== OTHER_CATEGORY_IDS.expense)
    expect(initialCategoryId(noOther, 'expense')).toBe('')
  })
})
