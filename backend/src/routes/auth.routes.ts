import { describeRoute, resolver } from "hono-openapi"
import { deleteCookie } from "hono/cookie"
import { Hono } from "hono"

import {
  signInResponseSchema,
  signUpResponseSchema,
  signUpSchema,
  signInSchema,
} from "@/schemas/auth.schema"
import {
  verifyPassword,
  setAuthCookie,
  hashPassword,
  createJWT,
} from "@/lib/session"
import { privateUserSelect } from "@/lib/selects/user.selects"
import { jsonSuccessSchema } from "@/schemas/shared.schema"
import { zodValidator } from "@/middlewares/zod-validator"
import { jsonSuccess, jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

const authRouter = new Hono()

// ------------------------------- Sign Up --------------------------------
authRouter.post(
  "/signup",
  describeRoute({
    tags: ["Auth"],
    summary: "Sign Up",
    description: "Create a new User.",
    responses: {
      201: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(signUpResponseSchema)),
          },
        },
        description: "Successfully created a user.",
      },
    },
  }),
  zodValidator("json", signUpSchema),
  async (c) => {
    const { username, email, name, password } = c.req.valid("json")
    const hashedPassword = await hashPassword(password)

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
      select: privateUserSelect,
      data: { password: hashedPassword, username, email, name },
    })

    const token = await createJWT(user.id)
    setAuthCookie(c, token)

    return jsonSuccess(c, { data: user }, { status: 201 })
  }
)

// ------------------------------- Sign In --------------------------------
authRouter.post(
  "/signin",
  describeRoute({
    tags: ["Auth"],
    summary: "Sign In",
    description: "Sign in to your account.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(signInResponseSchema)),
          },
        },
        description: "Successfully signed in.",
      },
    },
  }),
  zodValidator("json", signInSchema),
  async (c) => {
    const { email, password } = c.req.valid("json")

    const user = await prisma.user.findUnique({
      select: { ...privateUserSelect, password: true },
      where: { email },
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

    const isPasswordValid = await verifyPassword(password, user.password)

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

    const token = await createJWT(user.id)
    setAuthCookie(c, token)

    const { password: _, ...userWithoutPassword } = user
    return jsonSuccess(c, { data: userWithoutPassword }, { status: 200 })
  }
)

// ------------------------------- Sign Out --------------------------------
authRouter.post("/signout", (c) => {
  deleteCookie(c, "token", { httpOnly: true, secure: true, path: "/" })
  // Abstract into a helper function called `jsonNoContent` if used in one more place.
  return c.body(null, 204)
})

export default authRouter
