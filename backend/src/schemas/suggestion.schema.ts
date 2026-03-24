import * as z from "zod"

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
