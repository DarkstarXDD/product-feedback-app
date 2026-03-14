import type { Prisma } from "@/db/client"

// ------------------------------- GET All Suggestions --------------------------------
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

export type SuggestionListItem = Prisma.SuggestionGetPayload<{
  select: typeof suggestionListSelect
}>

// ------------------------------- GET a Suggestion --------------------------------
export const suggestionSelect = {
  comments: {
    select: {
      user: { select: { username: true, name: true, id: true } },
      createdAt: true,
      updatedAt: true,
      content: true,
      id: true,
    },
    orderBy: { createdAt: "asc" },
  },
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

export type Suggestion = Prisma.SuggestionGetPayload<{
  select: typeof suggestionSelect
}>

// ------------------------------- Create/Update a Suggestion --------------------------------
export const suggestionCreateSelect = {
  category: { select: { name: true, slug: true, id: true } },
  status: { select: { name: true, slug: true, id: true } },
  _count: { select: { comments: true, upvotes: true } },
  description: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  slug: true,
  id: true,
} as const satisfies Prisma.SuggestionSelect

export type SuggestionCreate = Prisma.SuggestionGetPayload<{
  select: typeof suggestionCreateSelect
}>

export type PublicUser = Prisma.SuggestionGetPayload<{
  select: typeof suggestionListSelect
}>
