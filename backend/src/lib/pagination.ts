export type Pagination = {
  page: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  totalItems: number
  totalPages: number
}

/** Returns pagination metadata. */
export function buildPagination({
  page,
  pageSize,
  totalItems,
}: {
  totalItems: number
  pageSize: number
  page: number
}): Pagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  return {
    page,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totalItems,
    totalPages,
  }
}
