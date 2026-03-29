import * as z from "zod"

import type { CommentResponse } from "@/lib/selects/comment.select"

// --------------------- Create Comment Schema -----------------------
export const commentCreateSchema = z.object({
  content: z
    .string("Invalid comment")
    .min(1, "Comment cannot be empty")
    .max(500, "Comment cannot have more than 500 characters")
    .meta({
      example: "I would love to see this added.",
      description: "Comment content.",
    }),
})

// --------------------- Update Comment Schema -----------------------
export const commentUpdateSchema = commentCreateSchema

// --------------------- Comment Response Schema -----------------------
export const commentResponseSchema: z.ZodType<CommentResponse> = z.object({
  id: z.cuid().meta({ pattern: undefined, example: "cmlubyi3l000094r6fw9v8djs", "x-order": 1 }),
  content: z.string().meta({ example: "I would love to see this added.", "x-order": 2 }),
  createdAt: z.date().meta({ example: "2026-01-01T00:00:00.000Z", "x-order": 3 }),
  updatedAt: z.date().meta({ example: "2026-01-01T00:00:00.000Z", "x-order": 4 }),
  suggestion: z
    .object({
      id: z.cuid().meta({ pattern: undefined }),
      slug: z.string().meta({ example: "add-dark-mode-support" }),
      title: z.string().meta({ example: "Add dark mode support" }),
    })
    .meta({ "x-order": 5 }),
  user: z
    .object({
      id: z.cuid().meta({ pattern: undefined }),
      username: z.string().meta({ example: "johndoe" }),
      name: z.string().meta({ example: "John Doe" }),
    })
    .meta({ "x-order": 6 }),
})
