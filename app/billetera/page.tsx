import { Billetera } from '@/components/billetera'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billetera | Bolívar Convert',
  description:
    'Gestiona tus cuentas, gastos e ingresos en bolívares, dólares y euros. Traspasos con conversión, categorías, estadísticas y presupuestos.',
}

export default function BilleteraPage() {
  return (
    <div className="container mx-auto px-4 pb-8 md:pb-12 -mt-3 md:-mt-5">
      <Billetera />
    </div>
  )
}
