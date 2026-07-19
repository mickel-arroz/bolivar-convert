import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/layout/Footer'
import { describe, it, expect } from 'vitest'

describe('Footer Component (Unit Test)', () => {
  it('renders the developer credit correctly', () => {
    render(<Footer />)

    // Validate that the footer developer credit is rendered in the DOM
    const textElement = screen.getByText(/Desarrollado por/i)

    expect(textElement).toBeInTheDocument()
  })
})
