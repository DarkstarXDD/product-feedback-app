import * as z from "zod"

/** Base schema for user. */
export const userSchema = z.object({
  username: z
    .string("Invalid username")
    .min(1, "Username cannot be empty")
    .max(30, "Username cannot have more than 30 characters"),
  name: z
    .string("Invalid name")
    .min(1, "Name cannot be empty")
    .max(50, "Name cannot have more than 50 characters"),
  email: z.email("Invalid email").toLowerCase(),
})

// --------------------- User Update Schema -----------------------
export const userUpdateSchema = userSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field is required",
  })
