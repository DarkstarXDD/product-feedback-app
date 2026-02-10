import * as z from "zod"

// --------------------- SignUp Schema -----------------------
export const createUserSchema = z
  .object({
    email: z
      .email("Invalid email")
      .min(1, "Email cannot be empty")
      .toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    username: z.string().min(1, "Username cannot be empty"),
    name: z.string().min(1, "Username cannot be empty"),
    confirmPassword: z.string(),
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

// const data = {
//   confirmPassword: "harry123",
//   email: "HarRy@email.com",
//   username: "harrypotter1",
//   password: "harry123",
//   name: "Harry",
// }

// const parsed = createUserSchema.safeParse(data)

// if (!parsed.success) {
//   const errors = z.flattenError(parsed.error)
//   console.log(errors)
// }

// if (parsed.success) {
//   console.log(parsed.data)
// }
