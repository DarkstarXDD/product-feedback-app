import type { Prisma } from "@/db/client"

/** Fields that are included when an Upvote is fetched. */
export const upvoteSelect = {
  id: true,
  createdAt: true,
  userId: true,
  suggestionId: true,
} as const satisfies Prisma.UpvoteSelect

export type UpvoteResponse = Prisma.UpvoteGetPayload<{
  select: typeof upvoteSelect
}>
