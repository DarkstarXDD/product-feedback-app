import { describeRoute } from "hono-openapi"
import { deleteCookie } from "hono/cookie"
import { Hono } from "hono"

import {
  verifyPassword,
  setAuthCookie,
  hashPassword,
  createJWT,
} from "@/lib/session"
import { jsonSuccessSchema, jsonErrorSchema } from "@/schemas/response.schema"
import { unauthorized, jsonSuccess, conflict } from "@/lib/responses"
import { signUpSchema, signInSchema } from "@/schemas/auth.schema"
import { privateUserResponseSchema } from "@/schemas/user.schema"
import { privateUserSelect } from "@/lib/selects/user.select"
import { zodValidator } from "@/middleware/zod-validator"
import { jsonResponse } from "@/lib/openapi"
import { prisma } from "@/db/client"

const authRouter = new Hono()

// ------------------------------- Sign Up --------------------------------
authRouter.post(
  "/signup",
  describeRoute({
    tags: ["Auth"],
    summary: "Sign Up",
    description: "Creates a new user.",
    responses: {
      201: jsonResponse(
        jsonSuccessSchema(privateUserResponseSchema),
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
    const { name, username, email, password } = c.req.valid("json")
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
      return conflict(c, "Conflict", { fieldErrors })
    }

    const user = await prisma.user.create({
      data: { name, username, email, password: hashedPassword },
      select: privateUserSelect,
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
    description: "Signs in to an account.",
    responses: {
      200: jsonResponse(
        jsonSuccessSchema(privateUserResponseSchema),
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
      where: { email },
      select: { ...privateUserSelect, password: true },
    })

    if (!user)
      return unauthorized(c, "Unauthorized", {
        formErrors: ["Invalid email or password"],
      })

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid)
      return unauthorized(c, "Unauthorized", {
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
    description: "Signs out of an account.",
    responses: {
      204: { description: "Successfully signed out." },
    },
  }),
  (c) => {
    deleteCookie(c, "token", { httpOnly: true, secure: true, path: "/" })
    return c.body(null, 204)
  }
)

export default authRouter
