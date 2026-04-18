import { describe, expect, test } from "vitest"

import { buildPagination } from "@/lib/pagination"

describe("Pagination", () => {
  test("Returns correct metadata for a middle page", () => {
    const result = buildPagination({ page: 2, pageSize: 10, totalItems: 50 })
    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      hasPreviousPage: true,
      hasNextPage: true,
      totalItems: 50,
      totalPages: 5,
    })
  })

  test("First page has no previous page", () => {
    const result = buildPagination({ page: 1, pageSize: 20, totalItems: 100 })
    expect(result.hasPreviousPage).toBe(false)
  })

  test("Last page has no next page", () => {
    const result = buildPagination({ page: 10, pageSize: 50, totalItems: 500 })
    expect(result.hasNextPage).toBe(false)
  })

  test("No previous or last page when only 1 page", () => {
    const result = buildPagination({ page: 1, pageSize: 10, totalItems: 10 })
    expect(result.hasPreviousPage).toBe(false)
    expect(result.hasNextPage).toBe(false)
  })

  test("Returns totalPages of 1 when there are no items", () => {
    const result = buildPagination({ page: 1, pageSize: 10, totalItems: 0 })
    expect(result.totalPages).toBe(1)
  })

  test("Rounds up totalPages for uneven division", () => {
    const result = buildPagination({ page: 1, pageSize: 10, totalItems: 11 })
    expect(result.totalPages).toBe(2)
  })
})
