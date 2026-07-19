/**
 * Feed unificado de movimientos. La implementación vive en `lib/wallet/compute.ts`
 * (compartida con el servidor); aquí solo se reexporta para el cliente.
 */
export type { FeedItem } from '@/lib/wallet/compute'
export { buildFeed } from '@/lib/wallet/compute'
