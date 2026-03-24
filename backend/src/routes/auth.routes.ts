import { describeRoute, resolver } from "hono-openapi"
import { deleteCookie, setCookie } from "hono/cookie"
import { compare, hash } from "bcryptjs"
import { sign } from "hono/jwt"
import { Hono } from "hono"
import * as z from "zod"

import { signUpSchema, signInSchema } from "@/schemas/auth.schema"
import { zodValidator } from "@/middlewares/zod-validator"
import { jsonSuccess, jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

/** Set JWT and Cookie expiration for 7 days. */
export const JWT_TTL_SECONDS = 60 * 60 * 24 * 7

const authRoutes = new Hono()

const tempSigUpResponseSchema = z.object({
  username: z.string(),
  name: z.string(),
})

// ------------------------------- Sign Up --------------------------------
authRoutes.post(
  "/signup",
  zodValidator("json", signUpSchema),
  describeRoute({
    tags: ["Auth"],
    summary: "Create a User",
    description: "Create a new User",
    responses: {
      200: {
        content: {
          "application/json": { schema: resolver(tempSigUpResponseSchema) },
        },
        description: "Successfully created a user",
      },
    },
  }),
  async (c) => {
    const parsedData = c.req.valid("json")

    const hashedPassword = await hash(parsedData.password, 10)
    const { username, email, name } = parsedData

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
  }
)

// ------------------------------- Sign In --------------------------------
authRoutes.post("/signin", zodValidator("json", signInSchema), async (c) => {
  const parsedData = c.req.valid("json")

  const user = await prisma.user.findUnique({
    select: {
      createdAt: true,
      password: true,
      username: true,
      email: true,
      name: true,
      id: true,
    },
    where: { email: parsedData.email },
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

  const isPasswordValid = await compare(parsedData.password, user.password)

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

export default authRoutes
