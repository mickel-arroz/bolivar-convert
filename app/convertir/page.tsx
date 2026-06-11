import { ConvertForm } from '@/components/convertir/ConvertForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculadora de Conversión | Bolívar Convert',
  description: 'Convierte montos dinámicamente entre Bolívares y Dólares usando las tasas del BCV, Binance y personalizadas.'
}

export default function ConvertirPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <ConvertForm />
    </div>
  )
}
