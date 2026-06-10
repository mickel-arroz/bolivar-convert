import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'
import { describe, it, expect } from 'vitest'

describe('Footer Component (Unit Test)', () => {
  it('renders the explanatory text correctly', () => {
    render(<Footer />)

    // Validate that the footer text is correctly rendered in the DOM
    const textElement = screen.getByText(
      /Hecho para proveer información de tasas de cambio. Actualizado diariamente./i
    )

    expect(textElement).toBeInTheDocument()
  })
})
