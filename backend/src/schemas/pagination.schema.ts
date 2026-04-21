import * as z from "zod"

import type { Pagination } from "@/lib/pagination"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

export const paginationSchema = z.object({
  pageSize: z.coerce
    .number("Invalid pageSize")
    .int("pageSize must be a whole number")
    .min(1, "pageSize must be at least 1")
    .max(MAX_PAGE_SIZE, `pageSize cannot be more than ${String(MAX_PAGE_SIZE)}`)
    .default(DEFAULT_PAGE_SIZE)
    .meta({
      example: DEFAULT_PAGE_SIZE,
      description: "Number of items to return per page.",
      "x-order": 1,
    }),
  page: z.coerce
    .number("Invalid page")
    .int("page must be a whole number")
    .min(1, "page must be at least 1")
    .default(DEFAULT_PAGE)
    .meta({
      example: DEFAULT_PAGE,
      description: "Page number to return.",
      "x-order": 2,
    }),
})

// --------------------- Pagination Response Schema -----------------------
export const paginationResponseSchema: z.ZodType<Pagination> = z.object({
  page: z.number().meta({ example: 1, "x-order": 1 }),
  pageSize: z.number().meta({ example: 10, "x-order": 2 }),
  hasNextPage: z.boolean().meta({ example: true, "x-order": 3 }),
  hasPreviousPage: z.boolean().meta({ example: false, "x-order": 4 }),
  totalItems: z.number().meta({ example: 100, "x-order": 5 }),
  totalPages: z.number().meta({ example: 10, "x-order": 6 }),
})
