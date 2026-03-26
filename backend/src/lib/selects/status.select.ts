import type { Prisma } from "@/db/client"

export const statusSelect = {
  createdAt: true,
  updatedAt: true,
  slug: true,
  name: true,
  id: true,
} as const satisfies Prisma.StatusSelect

export type Status = Prisma.StatusGetPayload<{
  select: typeof statusSelect
}>
