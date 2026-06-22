import { render, screen, fireEvent } from '@testing-library/react'
import { BillSplitter } from '@/components/dividir/BillSplitter'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TAX_RATES } from '@/constants/config'
import { useRates } from '@/hooks/useRates'

vi.mock('@/hooks/useRates')

const mockRates = {
  bcvUsd: '36.50',
  bcvEur: '39.20',
  binanceUsdAvg: '38.10',
  lastUpdate: '2026-06-11T12:00:00Z'
}

describe('BillSplitter Component', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(useRates).mockReturnValue({
      rates: mockRates,
      loading: false,
      isStale: false,
      isOffline: false,
      error: false,
      fetchRates: vi.fn(),
      formatLastUpdate: (d: string) => d
    })
  })

  it('renders correctly with default itemized mode', () => {
    render(<BillSplitter />)

    // Should have split mode tabs
    expect(screen.getByText('Montos distintos')).toBeInTheDocument()
    expect(screen.getByText('Partes iguales')).toBeInTheDocument()

    // Add person button (disabled initially)
    expect(screen.getByText('+ Agregar')).toBeInTheDocument()
  })

  it('switches to equal split mode and shows Grand Total', () => {
    render(<BillSplitter />)

    // Switch tab
    const equalSplitTab = screen.getByText('Partes iguales')
    fireEvent.click(equalSplitTab)

    // Enter total amount
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '100' } })

    // Enter people count
    const peopleInput = screen.getByPlaceholderText('Ej: 4')
    fireEvent.change(peopleInput, { target: { value: '4' } })

    // Check if per person total is displayed (25)
    expect(screen.getByText('A cada uno le toca')).toBeInTheDocument()
    // It should render the formatted amount, symbol is Bs. and locale is es-VE
    expect(screen.getByText('Bs.25,00')).toBeInTheDocument()
    
    // Grand Total card should be visible
    expect(screen.getByText('Gran Total')).toBeInTheDocument()
  })

  it('handles itemized mode with IVA and IGTF toggles', () => {
    render(<BillSplitter />)

    // Switch currency to USD first to enable IGTF toggle
    const usdButton = screen.getByText('USD')
    fireEvent.click(usdButton)

    // Type name FIRST, then add person
    const nameInput = screen.getAllByPlaceholderText('Nombre de la persona…')[0]
    fireEvent.change(nameInput, { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText('+ Agregar'))

    // Add an item
    const amountInput = screen.getAllByPlaceholderText('Monto')[0]
    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.click(screen.getByLabelText('Agregar ítem'))
    
    // The default is IVA included = true, Tip included = true, IGTF included = false
    // Toggling IVA included to FALSE should add IVA
    const ivaToggle = screen.getByRole('switch', { name: 'Los precios ya incluyen IVA' })
    fireEvent.click(ivaToggle)

    // Toggling IGTF to TRUE should add IGTF
    const igtfToggle = screen.getByRole('switch', { name: `Cobrar IGTF (${TAX_RATES.IGTF * 100}%)` })
    fireEvent.click(igtfToggle)

    // Now look for IVA and IGTF lines in the Grand Total breakdown
    // Subtotal: 100, IVA: 16, IGTF: 3 -> Grand Total: 119
    expect(screen.getByText(`IVA (${TAX_RATES.IVA * 100}%)`)).toBeInTheDocument()
    expect(screen.getByText('+ $16,00')).toBeInTheDocument()

    expect(screen.getByText(`IGTF (${TAX_RATES.IGTF * 100}%)`)).toBeInTheDocument()
    expect(screen.getByText('+ $3,00')).toBeInTheDocument()

    // The grand total should be 119
    const grandTotalElement = screen.getAllByText('$119,00')
    expect(grandTotalElement.length).toBeGreaterThan(0)
  })
})
