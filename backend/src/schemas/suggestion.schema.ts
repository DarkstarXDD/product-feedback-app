import * as z from "zod"

import type {
  SuggestionWithCommentsResponse,
  SuggestionBaseResponse,
} from "@/lib/selects/suggestion.select"

// --------------------- Create Suggestion Schema -----------------------
export const suggestionCreateSchema = z.object({
  categoryId: z.cuid("Please pick a valid category").meta({
    pattern: undefined,
    example: "cmlasmow10007gkr6nu6ykpts",
    description: "Category id for the suggestion.",
    "x-order": 1,
  }),
  title: z
    .string("Invalid title")
    .min(1, "Title cannot be empty")
    .max(150, "Title cannot have more than 150 characters")
    .meta({
      example: "Add dark mode support",
      description: "Suggestion title.",
      "x-order": 2,
    }),
  description: z
    .string("Invalid description")
    .min(1, "Description cannot be empty")
    .max(500, "Description cannot have more than 500 characters")
    .meta({
      example:
        "It would be helpful to have a dark mode toggle when reading at night.",
      description: "Suggestion description.",
      "x-order": 3,
    }),
})

// --------------------- Update Suggestion Schema -----------------------
export const suggestionUpdateSchema = suggestionCreateSchema

// --------------------- Suggestion Response Schema -----------------------
export const suggestionBaseResponseSchema = z.object({
  id: z.cuid().meta({
    pattern: undefined,
    example: "cmlubyi3l000094r6fw9v8djs",
    "x-order": 1,
  }),
  slug: z.string().meta({ example: "add-dark-mode-support", "x-order": 2 }),
  title: z.string().meta({ example: "Add dark mode support", "x-order": 3 }),
  description: z.string().meta({
    example:
      "It would be helpful to have a dark mode toggle when reading at night.",
    "x-order": 4,
  }),
  createdAt: z.iso.datetime().meta({
    pattern: undefined,
    example: "2026-01-01T00:00:00.000Z",
    "x-order": 5,
  }),
  updatedAt: z.iso.datetime().meta({
    pattern: undefined,
    example: "2026-01-01T00:00:00.000Z",
    "x-order": 6,
  }),
  _count: z
    .object({
      comments: z.number(),
      upvotes: z.number(),
    })
    .meta({ "x-order": 7 }),
  category: z
    .object({
      id: z.cuid().meta({ pattern: undefined }),
      name: z.string().meta({ example: "UI" }),
      slug: z.string().meta({ example: "ui" }),
    })
    .meta({ "x-order": 8 }),
  status: z
    .object({
      id: z.cuid().meta({ pattern: undefined }),
      name: z.string().meta({ example: "Planned" }),
      slug: z.string().meta({ example: "planned" }),
    })
    .nullable()
    .meta({ "x-order": 9 }),
  user: z
    .object({
      id: z.cuid().meta({ pattern: undefined }),
      username: z.string().meta({ example: "johndoe" }),
      name: z.string().meta({ example: "John Doe" }),
    })
    .meta({ "x-order": 10 }),
  viewerHasUpvoted: z.boolean().meta({ "x-order": 11 }),
}) satisfies z.ZodType<SuggestionBaseResponse>

// --------------------- Suggestion With Comments Response Schema -----------------------
export const suggestionWithCommentsResponseSchema: z.ZodType<SuggestionWithCommentsResponse> =
  suggestionBaseResponseSchema.extend({
    comments: z
      .array(
        z.object({
          id: z.cuid().meta({ pattern: undefined, "x-order": 1 }),
          content: z
            .string()
            .meta({ example: "I would love to see this added.", "x-order": 2 }),
          createdAt: z.iso.datetime().meta({
            pattern: undefined,
            example: "2026-01-01T00:00:00.000Z",
            "x-order": 3,
          }),
          updatedAt: z.iso.datetime().meta({
            pattern: undefined,
            example: "2026-01-01T00:00:00.000Z",
            "x-order": 4,
          }),
          user: z
            .object({
              id: z.cuid().meta({ pattern: undefined }),
              username: z.string().meta({ example: "johndoe" }),
              name: z.string().meta({ example: "John Doe" }),
            })
            .meta({ "x-order": 5 }),
        })
      )
      .meta({ "x-order": 12 }),
  })
