export const PAGE_SIZE = 25

/** Clamp after filtering/deletion, without ever mutating the full source dataset. */
export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = PAGE_SIZE) {
  const size = Math.max(1, Math.floor(pageSize) || PAGE_SIZE)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const page = Math.max(1, Math.min(pages, Math.floor(requestedPage) || 1))
  const start = (page - 1) * size
  return { items: items.slice(start, start + size), page, pages, total: items.length,
    from: items.length ? start + 1 : 0, to: Math.min(start + size, items.length) }
}
