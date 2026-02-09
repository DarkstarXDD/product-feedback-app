import * as z from "zod"

export const createUserSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    email: z.email("Invalid email").min(1, "Email cannot be empty"),
    username: z.string().min(1, "Username cannot be empty"),
    name: z.string().min(1, "Username cannot be empty"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  })

// const data = {
//   email: "harry@email.com",
//   password: "harry123i",
//   confirmPassword: "",
//   name: "Harry",
//   username: "",
// }

// const parsed = createUserSchema.safeParse(data)

// if (!parsed.success) {
//   const errors = z.flattenError(parsed.error)
//   console.log(errors)
// }
