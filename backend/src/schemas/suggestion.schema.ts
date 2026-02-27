import * as z from "zod"

// --------------------- Create Suggestion Schema -----------------------
export const suggestionCreateSchema = z.object({
  description: z
    .string("Invalid description")
    .min(1, "Description cannot be empty")
    .max(500, "Description cannot have more than 500 characters"),
  title: z
    .string("Invalid title")
    .min(1, "Title cannot be empty")
    .max(150, "Title cannot have more than 150 characters"),
  categoryId: z.cuid("Please pick a valid category"),
})
