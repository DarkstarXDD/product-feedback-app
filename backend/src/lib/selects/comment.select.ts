import type { Serialize } from "@/lib/types"
import type { Prisma } from "@/db/client"

/** Fields that are included when a Comment is fetched. */
export const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  suggestion: { select: { id: true, slug: true, title: true } },
  user: { select: { id: true, username: true, name: true } },
} as const satisfies Prisma.CommentSelect

export type CommentResponse = Serialize<
  Prisma.CommentGetPayload<{
    select: typeof commentSelect
  }>
>
