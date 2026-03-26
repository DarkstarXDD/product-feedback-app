import type { Prisma } from "@/db/client"

// ------------------------------- GET All Suggestions --------------------------------
/** Base fields for a Suggestion. Excludes the comments list. */
export const suggestionSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: true,
  category: { select: { id: true, name: true, slug: true } },
  status: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, username: true, name: true } },
} as const satisfies Prisma.SuggestionSelect

type Suggestion = Prisma.SuggestionGetPayload<{
  select: typeof suggestionSelect
}>

export type SuggestionResponse = {
  viewerHasUpvoted: boolean
} & Suggestion

// ------------------------------- GET a Suggestion --------------------------------
/** Extends `SuggestionSelect` to include the comments list for that suggestion. */
export const suggestionWithCommentsSelect = {
  ...suggestionSelect,
  comments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, username: true, name: true } },
    },
  },
} as const satisfies Prisma.SuggestionSelect

type SuggestionWithCommentsSelect = Prisma.SuggestionGetPayload<{
  select: typeof suggestionWithCommentsSelect
}>

export type SuggestionWithCommentsResponse = {
  viewerHasUpvoted: boolean
} & SuggestionWithCommentsSelect

// ------------------------------- Create a Suggestion --------------------------------
/** Fields that are included when a suggestion is created. */
export const suggestionCreateSelect = suggestionSelect

export type SuggestionCreateResponse = Prisma.SuggestionGetPayload<{
  select: typeof suggestionCreateSelect
}>

// ------------------------------- Update a Suggestion --------------------------------
/** Fields that are included when a suggestion is updated. */
export const suggestionUpdateSelect = suggestionSelect

export type SuggestionUpdateResponse = Prisma.SuggestionGetPayload<{
  select: typeof suggestionCreateSelect
}>
