import * as z from "zod"

import { userSchema } from "@/schemas/user.schema"

// --------------------- SignUp Schema -----------------------
export const signUpSchema = userSchema
  .extend({
    confirmPassword: z
      .string("Invalid confirm password")
      .min(1, "Confirm password can't be empty"),
    password: z
      .string("Invalid password")
      .min(8, "Password must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  })

// ------------------------ SignIn Schema ---------------------
export const signInSchema = z.object({
  email: z.email("Invalid email").min(1, "Email cannot be empty").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
})
