import { setCookie } from "hono/cookie"
import { sign } from "hono/jwt"
import { Hono } from "hono"

import { formatZodErrors, jsonSuccess, jsonError } from "@/lib/utils"
import { createUserSchema } from "@/schemas/auth.schema"
import { prisma } from "@/db/client"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

const auth = new Hono()

auth.post("/signup", async (c) => {
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

  const hashedPassword = await Bun.password.hash(parsed.data.password, "bcrypt")

  const { username, email, name } = parsed.data

  /**
   * Prisma doesn't provide a way to retreive the exact field name that violates the unique constraint.
   * So we need to manually check whether there are existing entries for the given unique fields.
   */
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  })

  if (existingUser) {
    const fieldErrors: Record<string, string[]> = {}

    if (existingUser.email === email) {
      fieldErrors.email = ["Email already exists"]
    }

    if (existingUser.username === username) {
      fieldErrors.username = ["Username already exists"]
    }

    return jsonError(
      c,
      {
        message: "Unique constraint violation",
        errors: { fieldErrors },
        code: "CONFLICT",
      },
      { status: 409 }
    )
  }

  const user = await prisma.user.create({
    select: {
      createdAt: true,
      username: true,
      email: true,
      name: true,
      id: true,
    },
    data: { password: hashedPassword, username, email, name },
  })

  const token = await sign({ userId: user.id }, JWT_SECRET, "HS256")
  setCookie(c, "token", token)

  return jsonSuccess(c, { user }, { status: 201 })
})

auth.post("/signin", (c) => jsonSuccess(c, { message: "Success" }))
auth.post("/signout", (c) => jsonSuccess(c, { message: "Success" }))

export { auth as authRoutes }
