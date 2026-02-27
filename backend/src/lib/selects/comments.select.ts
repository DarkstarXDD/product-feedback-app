import type { Prisma } from "@/db/client"

export const commentsListSelect = {
  user: { select: { username: true, name: true, role: true, id: true } },
  suggestion: { select: { title: true, slug: true, id: true } },
  createdAt: true,
  updatedAt: true,
  content: true,
  id: true,
} as const satisfies Prisma.CommentSelect
