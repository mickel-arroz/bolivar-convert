import type { MutationResult } from '@/hooks/useWallet'

type Failure = Extract<MutationResult, { ok: false }>['reason']

/** Qué se intentaba hacer, para que el mensaje del rechazo diga lo correcto. */
export type MutationAction = 'edit' | 'deleteTx' | 'deleteTransfer'

/** Título y detalle de un cambio o eliminación que el hook rechazó. */
export function mutationError(
  reason: Failure,
  action: MutationAction
): { title: string; description: string } {
  switch (reason) {
    case 'overdraw':
      if (action === 'edit') {
        return {
          title: 'No se pudo guardar el cambio',
          description: 'Dejaría una cuenta en negativo: el monto supera su Disponible.',
        }
      }
      return action === 'deleteTransfer'
        ? {
            title: 'No se puede eliminar el traspaso',
            description:
              'La cuenta destino ya gastó o apartó en metas ese dinero y quedaría en negativo.',
          }
        : {
            title: 'No se puede eliminar el movimiento',
            description:
              'El dinero de este ingreso ya se usó o está apartado en metas: la cuenta quedaría en negativo.',
          }
    case 'locked':
      return {
        title: 'No se puede cambiar el dinero de esta compra',
        description:
          'Este gasto es la compra de un producto. Para cambiar el monto, la cuenta o la comisión, deshaz la compra y confírmala de nuevo.',
      }
    case 'invalid':
      return {
        title: 'Revisa los datos del movimiento',
        description: 'El monto debe ser mayor que cero y la categoría debe ser del mismo tipo.',
      }
    case 'missing':
      return { title: 'Ese movimiento ya no existe', description: 'Actualiza la lista e intenta de nuevo.' }
  }
}
