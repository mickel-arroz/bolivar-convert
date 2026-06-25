import { Transaction, Transfer } from '@/hooks/useWallet'

export type FeedItem =
  | { kind: 'tx'; id: string; date: string; tx: Transaction }
  | { kind: 'transfer'; id: string; date: string; transfer: Transfer }

/** Combina transacciones y traspasos en un único feed ordenado por fecha descendente. */
export function buildFeed(transactions: Transaction[], transfers: Transfer[]): FeedItem[] {
  const items: FeedItem[] = [
    ...transactions.map((tx) => ({ kind: 'tx' as const, id: tx.id, date: tx.date, tx })),
    ...transfers.map((transfer) => ({
      kind: 'transfer' as const,
      id: transfer.id,
      date: transfer.date,
      transfer,
    })),
  ]
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
