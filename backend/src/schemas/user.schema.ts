import * as z from "zod"

import type {
  PrivateUserResponse,
  PublicUserResponse,
} from "@/lib/selects/user.select"

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

// --------------------- PublicUser Response Schema -----------------------
export const publicUserResponseSchema: z.ZodType<PublicUserResponse> = z.object(
  {
    name: z.string().meta({ example: "John Doe", "x-order": 1 }),
    username: z.string().meta({ example: "johndoe", "x-order": 2 }),
  }
)

// --------------------- PrivateUser Response Schema -----------------------
export const privateUserResponseSchema: z.ZodType<PrivateUserResponse> =
  z.object({
    id: z.cuid().meta({
      pattern: undefined,
      example: "cmlubyi3l000094r6fw9v8djs",
      "x-order": 1,
    }),
    name: z.string().meta({ example: "John Doe", "x-order": 2 }),
    username: z.string().meta({ example: "johndoe", "x-order": 3 }),
    email: z
      .email()
      .meta({ pattern: undefined, example: "johndoe@email.com", "x-order": 4 }),
    role: z.enum(["USER", "ADMIN"]).meta({ example: "USER", "x-order": 5 }),
    createdAt: z.iso.datetime().meta({
      pattern: undefined,
      example: "2026-01-01T00:00:00.000Z",
      "x-order": 6,
    }),
    updatedAt: z.iso.datetime().meta({
      pattern: undefined,
      example: "2026-01-01T00:00:00.000Z",
      "x-order": 7,
    }),
    _count: z
      .object({
        suggestions: z.number(),
        comments: z.number(),
        upvotes: z.number(),
      })
      .meta({ "x-order": 8 }),
  })
