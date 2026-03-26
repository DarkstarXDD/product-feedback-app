import type { Prisma } from "@/db/client"

/** Fields that are included when a Category is fetched. */
export const categorySelect = {
  id: true,
  slug: true,
  name: true,
} as const satisfies Prisma.CategorySelect

export type CategoryResponse = Prisma.CategoryGetPayload<{
  select: typeof categorySelect
}>
