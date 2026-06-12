import { render, screen, fireEvent } from '@testing-library/react'
import { ConvertForm } from '@/components/convertir/ConvertForm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRates } from '@/hooks/useRates'

// Mock the hook
vi.mock('@/hooks/useRates')

const mockRates = {
  bcvUsd: '36.50',
  bcvEur: '39.20',
  binanceUsdAvg: '38.10',
  lastUpdate: '2026-06-11T12:00:00Z'
}

describe('ConvertForm Component', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(useRates).mockReturnValue({
      rates: mockRates,
      loading: false,
      isStale: false,
      error: false,
      fetchRates: vi.fn(),
      formatLastUpdate: (d: string) => d
    })
  })

  it('renders correctly and performs conversions', () => {
    render(<ConvertForm />)

    // Check title
    expect(screen.getByText(/Calculadora Dinámica/i)).toBeInTheDocument()

    // Default amount is 1 VES
    const amountInput = screen.getByLabelText(/Monto a Convertir/i) as HTMLInputElement
    expect(amountInput.value).toBe('1')

    // 1 VES in USD (at 36.50) is ~0.027...
    // The component formats it with 2 decimal places: 1 / 36.50 = 0.02739 -> 0.03
    expect(screen.getAllByText(/0\.03/).length).toBeGreaterThan(0)
  })

  it('updates results when amount changes', () => {
    render(<ConvertForm />)
    
    const amountInput = screen.getByLabelText(/Monto a Convertir/i) as HTMLInputElement
    
    // Change to 100 VES
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    // 100 / 36.50 = 2.739... -> "2.74"
    expect(screen.getAllByText(/2\.74/).length).toBeGreaterThan(0)
  })

  it('switches currency from VES to USD', () => {
    render(<ConvertForm />)
    
    // Use getAllByText for 'USD' and find the button specifically
    const usdButtons = screen.getAllByText('USD')
    const usdButton = usdButtons.find(el => el.tagName === 'BUTTON')
    if (!usdButton) throw new Error('USD button not found')
    
    fireEvent.click(usdButton)
    
    // Amount 1 USD -> VES (at 36.50) -> "36.50" or "36,50"
    // Multiple elements might have this text now because of the new labels
    expect(screen.getAllByText(/36[.,]50/).length).toBeGreaterThan(0)
  })

  it('converts 1 USD to VES using Euro rate correctly', () => {
    render(<ConvertForm />)
    
    // Cambiar a USD
    const usdButton = screen.getAllByRole('button').find(b => b.textContent === 'USD')
    if (!usdButton) throw new Error('USD button not found')
    fireEvent.click(usdButton)

    // Monto 1 USD -> a tasa EUR de 39.20 -> "39.20"
    expect(screen.getAllByText(/39[.,]20/).length).toBeGreaterThan(0)
  })
})
