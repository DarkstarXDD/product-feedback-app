import type { Prisma } from "@/db/client"

export const commentSelect = {
  suggestion: { select: { title: true, slug: true, id: true } },
  user: { select: { username: true, name: true, id: true } },
  createdAt: true,
  updatedAt: true,
  content: true,
  id: true,
} as const satisfies Prisma.CommentSelect

export type Comment = Prisma.CommentGetPayload<{
  select: typeof commentSelect
}>
