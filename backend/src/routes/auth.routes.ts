import { deleteCookie, setCookie } from "hono/cookie"
import { sign } from "hono/jwt"
import { Hono } from "hono"

import { formatZodErrors, jsonSuccess, jsonError } from "@/lib/utils"
import { signUpSchema, signInSchema } from "@/schemas/auth.schema"
import { prisma } from "@/db/client"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

/** Set JWT and Cookie expiration for 7 days. */
const JWT_TTL_SECONDS = 60 * 60 * 24 * 7

const authRoutes = new Hono()

// ------------------------------- Sign Up --------------------------------
authRoutes.post("/signup", async (c) => {
  const data = (await c.req.json()) as unknown
  const parsed = signUpSchema.safeParse(data)

  if (!parsed.success)
    return jsonError(
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
    } else if (existingUser.username === username) {
      fieldErrors.username = [
        "Username taken. Please pick a different username",
      ]
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

  const exp = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS

  const token = await sign({ userId: user.id, exp }, JWT_SECRET, "HS256")

  setCookie(c, "token", token, {
    maxAge: JWT_TTL_SECONDS,
    sameSite: "Lax",
    httpOnly: true,
    secure: true,
    path: "/",
  })

  return jsonSuccess(c, { data: user }, { status: 201 })
})

// ------------------------------- Sign In --------------------------------
authRoutes.post("/signin", async (c) => {
  const data = (await c.req.json()) as unknown
  const parsed = signInSchema.safeParse(data)

  if (!parsed.success) {
    return jsonError(
      c,
      {
        errors: formatZodErrors(parsed.error),
        message: "Server validation fails",
        code: "VALIDATION_ERROR",
      },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    select: {
      createdAt: true,
      password: true,
      username: true,
      email: true,
      name: true,
      id: true,
    },
    where: { email: parsed.data.email },
  })

  if (!user)
    return jsonError(
      c,
      {
        errors: {
          formErrors: ["Invalid email or password"],
        },
        message: "Invalid email or password",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    )

  const isPasswordValid = await Bun.password.verify(
    parsed.data.password,
    user.password
  )

  if (!isPasswordValid)
    return jsonError(
      c,
      {
        errors: { formErrors: ["Invalid email or password"] },
        message: "Invalid email or password",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    )

  const exp = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS

  const token = await sign({ userId: user.id, exp }, JWT_SECRET, "HS256")

  setCookie(c, "token", token, {
    maxAge: JWT_TTL_SECONDS,
    sameSite: "Lax",
    httpOnly: true,
    secure: true,
    path: "/",
  })

  return jsonSuccess(c, {
    data: {
      createdAt: user.createdAt,
      username: user.username,
      email: user.email,
      name: user.name,
      id: user.id,
    },
  })
})

// ------------------------------- Sign Out --------------------------------
authRoutes.post("/signout", (c) => {
  deleteCookie(c, "token", { httpOnly: true, secure: true, path: "/" })
  // Abstract into a helper function called `jsonNoContent` if used in one more place.
  return c.body(null, 204)
})

// --------------------------- GET Route for Testing -------------------------
authRoutes.get("/signin", (c) => c.json({ message: "Success" }))

export default authRoutes
