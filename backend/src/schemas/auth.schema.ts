import * as z from "zod"

import { privateUserResponseSchema } from "@/schemas/user.schema"
import { userSchema } from "@/schemas/user.schema"

// --------------------- SignUp Schema -----------------------
export const signUpSchema = userSchema
  .extend({
    password: z
      .string("Invalid password")
      .min(8, "Password must be at least 8 characters long")
      .meta({
        example: "John1234",
        description: "Password.",
        "x-order": 4,
      }),
    confirmPassword: z
      .string("Invalid confirm password")
      .min(1, "Confirm password can't be empty")
      .meta({
        example: "John1234",
        description: "Must match the password field.",
        "x-order": 5,
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  })

// --------------------- SignUp Response Schema -----------------------
export const signUpResponseSchema = privateUserResponseSchema

// ------------------------ SignIn Schema ---------------------
export const signInSchema = z.object({
  email: z.email("Invalid email").toLowerCase().meta({
    pattern: undefined,
    example: "johndoe@email.com",
    description: "Registered email address.",
    "x-order": 1,
  }),
  password: z
    .string("Invalid password")
    .min(8, "Password must be at least 8 characters long")
    .meta({
      example: "John1234",
      description: "Password.",
      "x-order": 2,
    }),
})

// --------------------- SignIn Response Schema -----------------------
export const signInResponseSchema = privateUserResponseSchema
