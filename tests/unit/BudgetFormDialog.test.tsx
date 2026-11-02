import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BudgetFormDialog } from '@/components/billetera/BudgetFormDialog'
import { DEFAULT_CATEGORIES } from '@/constants/walletCategories'
import type { WalletApi } from '@/hooks/useWallet'

function renderForm() {
  const setBudget = vi.fn()
  const wallet = {
    state: {
      categories: DEFAULT_CATEGORIES,
      budgets: [],
      activeBudgetTemplateId: 'tpl_default',
      displayCurrency: 'VES',
    },
    setBudget,
  } as unknown as WalletApi
  render(<BudgetFormDialog open onOpenChange={vi.fn()} wallet={wallet} presetCategoryId="cat_food" />)
  return setBudget
}

/** Los campos de monto del formulario, en orden: límite estimado y extra. */
const amountInputs = () => screen.getAllByPlaceholderText('0,00')

describe('BudgetFormDialog — extra', () => {
  it('no deja guardar un extra negativo', () => {
    const setBudget = renderForm()

    fireEvent.change(amountInputs()[1], { target: { value: '-30' } })

    expect(screen.getByText(/El extra no puede ser negativo/)).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Guardar presupuesto' })
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(setBudget).not.toHaveBeenCalled()
  })

  it('un extra positivo se guarda', () => {
    const setBudget = renderForm()

    fireEvent.change(amountInputs()[0], { target: { value: '100' } })
    fireEvent.change(amountInputs()[1], { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))

    expect(setBudget).toHaveBeenCalledWith('cat_food', expect.any(String), '100', 'VES', '25')
  })
})
