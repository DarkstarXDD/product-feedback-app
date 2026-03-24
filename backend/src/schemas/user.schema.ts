import * as z from "zod"

/** Base schema for user. */
export const userSchema = z.object({
  name: z
    .string("Invalid name")
    .min(1, "Name cannot be empty")
    .max(50, "Name cannot have more than 50 characters")
    .meta({
      example: "John Doe",
      description: "Full name or first name.",
      "x-order": 1,
    }),
  username: z
    .string("Invalid username")
    .min(1, "Username cannot be empty")
    .max(30, "Username cannot have more than 30 characters")
    .meta({
      example: "johndoe",
      description: "Unique username.",
      "x-order": 2,
    }),
  email: z.email("Invalid email").toLowerCase().meta({
    pattern: undefined,
    example: "johndoe@email.com",
    description: "Unique email address.",
    "x-order": 3,
  }),
})

// --------------------- User Update Schema -----------------------
export const userUpdateSchema = userSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field is required",
  })
