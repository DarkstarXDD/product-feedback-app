import * as z from "zod"

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 50

export const paginationSchema = z.object({
  pageSize: z.coerce
    .number("Invalid pageSize")
    .int("pageSize must be a whole number")
    .min(1, "pageSize must be at least 1")
    .max(MAX_PAGE_SIZE, `pageSize cannot be more than ${String(MAX_PAGE_SIZE)}`)
    .default(DEFAULT_PAGE_SIZE),
  page: z.coerce
    .number("Invalid page")
    .int("page must be a whole number")
    .min(1, "page must be at least 1")
    .default(DEFAULT_PAGE),
})

export type PaginationQuery = z.infer<typeof paginationSchema>
