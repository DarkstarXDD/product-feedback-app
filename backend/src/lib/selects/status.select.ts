import type { Prisma } from "@/db/client"

/** Fields that are included when a Status is fetched. */
export const statusSelect = {
  id: true,
  slug: true,
  name: true,
} as const satisfies Prisma.StatusSelect

export type StatusResponse = Prisma.StatusGetPayload<{
  select: typeof statusSelect
}>
