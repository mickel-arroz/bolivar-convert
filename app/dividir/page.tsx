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
    <div className="container mx-auto px-4 pb-8 md:pb-12 -mt-3 md:-mt-5">
      <div className="flex flex-col gap-8">
        <DividirHeader />
        <BillSplitter />
      </div>
    </div>
  )
}

