import { describeRoute } from "hono-openapi"
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
import { jsonSuccessSchema, jsonErrorSchema } from "@/schemas/shared.schema"
import { unauthorized, jsonSuccess, conflict } from "@/lib/responses"
import { privateUserSelect } from "@/lib/selects/user.select"
import { zodValidator } from "@/middlewares/zod-validator"
import { jsonResponse } from "@/lib/openapi"
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
      201: jsonResponse(
        jsonSuccessSchema(signUpResponseSchema),
        "Successfully created a user."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Request body fails validation."
      ),
      409: jsonResponse(
        jsonErrorSchema,
        "Conflict. Provided email or username already exists in the database."
      ),
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
      return conflict(c, "Unique constraint violation", { fieldErrors })
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
      200: jsonResponse(
        jsonSuccessSchema(signInResponseSchema),
        "Successfully signed in."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Request body fails validation."
      ),
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. Email or password is invalid."
      ),
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
      return unauthorized(c, "Invalid email or password", {
        formErrors: ["Invalid email or password"],
      })

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid)
      return unauthorized(c, "Invalid email or password", {
        formErrors: ["Invalid email or password"],
      })

    const token = await createJWT(user.id)
    setAuthCookie(c, token)

    const { password: _, ...userWithoutPassword } = user
    return jsonSuccess(c, { data: userWithoutPassword }, { status: 200 })
  }
)

// ------------------------------- Sign Out --------------------------------
authRouter.post(
  "/signout",
  describeRoute({
    tags: ["Auth"],
    summary: "Sign Out",
    description: "Sign out of your account.",
    responses: {
      204: {
        description: "Successfully signed out.",
      },
    },
  }),
  (c) => {
    deleteCookie(c, "token", { httpOnly: true, secure: true, path: "/" })
    // Abstract into a helper function called `jsonNoContent` if used in one more place.
    return c.body(null, 204)
  }
)

export default authRouter
