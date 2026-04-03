import type { Serialize } from "@/lib/types"
import type { Prisma } from "@/db/client"

interface ViewerHasUpvoted {
  viewerHasUpvoted: boolean
}

// ------------------------------- Base Suggestion Response --------------------------------
/** Base fields for a Suggestion. Excludes the comments list and viewerHasUpvoted. */
export const suggestionBaseSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { comments: true, upvotes: true } },
  category: { select: { id: true, name: true, slug: true } },
  status: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, username: true, name: true } },
} as const satisfies Prisma.SuggestionSelect

export type SuggestionBaseResponse = Serialize<
  Prisma.SuggestionGetPayload<{
    select: typeof suggestionBaseSelect
  }>
>

// --------------------------- Get Suggestion with Upvotes Response ---------------------------
/** Extends `suggestionBaseSelect` to include `upvotes` field. */
export const suggestionWithViewerUpvoteSelect = (userId: string) =>
  ({
    ...suggestionBaseSelect,
    upvotes: {
      where: { userId },
      select: { id: true },
    },
  }) as const satisfies Prisma.SuggestionSelect

export type SuggestionWithViewerUpvoteResponse = SuggestionBaseResponse &
  ViewerHasUpvoted

// ------------------------- Get Suggestion with Comments Response --------------------------
/** Extends `suggestionBaseSelect` to include `comments` field. */
export const suggestionWithCommentsSelect = {
  ...suggestionBaseSelect,
  comments: {
    orderBy: { createdAt: "asc" },
    take: 10,
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, username: true, name: true } },
    },
  },
} as const satisfies Prisma.SuggestionSelect

export type SuggestionWithCommentsResponse = Serialize<
  Prisma.SuggestionGetPayload<{
    select: typeof suggestionWithCommentsSelect
  }>
> &
  ViewerHasUpvoted

// --------------------- Get Suggestion with Comments and Upvotes Response ---------------------
/** Extends `suggestionWithCommentsSelect` to include `upvotes` field. */
export const suggestionWithCommentsAndViewerUpvoteSelect = (userId: string) =>
  ({
    ...suggestionWithCommentsSelect,
    upvotes: {
      where: { userId },
      select: { id: true },
    },
  }) as const satisfies Prisma.SuggestionSelect

// ------------------------------- Create Suggestion Response --------------------------------
/** Fields that are included in the response when a suggestion is created. */
export const suggestionCreateSelect = suggestionBaseSelect

export type SuggestionCreateResponse = Serialize<
  Prisma.SuggestionGetPayload<{
    select: typeof suggestionCreateSelect
  }>
>

// ------------------------------- Update Suggestion Response --------------------------------
/** Fields that are included in the response when a suggestion is updated. */
export const suggestionUpdateSelect = suggestionBaseSelect

export type SuggestionUpdateResponse = Serialize<
  Prisma.SuggestionGetPayload<{
    select: typeof suggestionUpdateSelect
  }>
>
