import { Hono } from "hono"

import { formatZodErrors, jsonSuccess, jsonError } from "@/lib/utils"
import { createUserSchema } from "@/schemas/auth.schema"

const auth = new Hono()

auth.post("/signup", async (c) => {
  /**
   * 1. Grab the data from the JSON body. Client should send JSON, not formData.
   * 2. Validate using Zod. If validation fails call jsonError and return flattened errors.
   * 3. If validation pass, lowercase email, hash passsword, call Prisma and send data to database.
   * 4. If Prisma doesn't throw, create JWT using userId as payload.
   * 5. Send id, email and name to client in jsonSuccess. Don't send password.
   * 5. When sending jsonSuccess, attach the JWT as a httpOnly cookie in Set-Cookie header.
   */
  const data = (await c.req.json()) as unknown
  const parsed = createUserSchema.safeParse(data)

  if (!parsed.success)
    jsonError(
      c,
      {
        errors: formatZodErrors(parsed.error),
        message: "Server validation fails",
        code: "VALIDATION_ERROR",
      },
      { status: 400 }
    )

  console.log(data)
  console.log(parsed)

  return jsonSuccess(c, { message: "Success" })
})

auth.post("/signin", (c) => jsonSuccess(c, { message: "Success" }))
auth.post("/signout", (c) => jsonSuccess(c, { message: "Success" }))

export { auth as authRoutes }
