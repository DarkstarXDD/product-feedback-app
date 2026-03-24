import * as z from "zod"

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
