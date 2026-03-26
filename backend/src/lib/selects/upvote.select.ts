import type { Prisma } from "@/db/client"

export const upvoteSelect = {
  suggestionId: true,
  createdAt: true,
  userId: true,
  id: true,
} as const satisfies Prisma.UpvoteSelect

export type Upvote = Prisma.UpvoteGetPayload<{
  select: typeof upvoteSelect
}>
