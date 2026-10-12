interface Searchable {
  title: string
  description?: string
}

function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function filterShoppingItems<T extends Searchable>(items: T[], query: string): T[] {
  const q = normalizeForSearch(query.trim())
  if (!q) return items
  return items.filter(
    (it) =>
      normalizeForSearch(it.title).includes(q) ||
      normalizeForSearch(it.description ?? '').includes(q)
  )
}
