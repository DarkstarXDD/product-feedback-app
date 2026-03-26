import type { Prisma } from "@/db/client"

export const categorySelect = {
  createdAt: true,
  updatedAt: true,
  slug: true,
  name: true,
  id: true,
} as const satisfies Prisma.CategorySelect

export type Category = Prisma.CategoryGetPayload<{
  select: typeof categorySelect
}>
