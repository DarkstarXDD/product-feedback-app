import type { Prisma } from "@/db/client"

export const suggestionListSelect = {
  category: { select: { name: true, slug: true, id: true } },
  user: { select: { username: true, name: true, id: true } },
  status: { select: { name: true, slug: true, id: true } },
  _count: { select: { comments: true, upvotes: true } },
  description: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  slug: true,
  id: true,
} as const satisfies Prisma.SuggestionSelect

export const suggestionCreateSelect = {
  category: { select: { name: true, slug: true, id: true } },
  description: true,
  createdAt: true,
  statusId: true,
  title: true,
  slug: true,
  id: true,
} as const satisfies Prisma.SuggestionSelect

export type PublicUser = Prisma.SuggestionGetPayload<{
  select: typeof suggestionListSelect
}>
