import { BillSplitter } from '@/components/dividir/BillSplitter'
import { Metadata } from 'next'
import { DividirHeader } from '@/components/dividir/DividirHeader'

export const metadata: Metadata = {
  title: 'Dividir Factura | Bolívar Convert',
  description:
    'Divide fácilmente la cuenta entre varios. Calcula cuánto debe pagar cada persona incluyendo IVA y propina de forma proporcional.'
}

export default function DividirPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <DividirHeader />

      <BillSplitter />
    </div>
  )
}

