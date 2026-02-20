import { Hono } from "hono"

import type { HonoInstanceVariables } from "@/lib/types"

import { formatZodErrors, jsonSuccess, jsonError } from "@/lib/utils"
import { userUpdateSchema } from "@/schemas/user.schema"
import { prisma } from "@/db/client"

const meRoutes = new Hono<{ Variables: HonoInstanceVariables }>()

// ------------------------------- Get Current User ----------------------------------
meRoutes.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload")

  const user = await prisma.user.findUnique({
    include: { suggestions: true, comments: true, upvotes: true, _count: true },
    where: { id: jwtPayload.userId },
    omit: { password: true },
  })

  if (!user) {
    return jsonError(
      c,
      { message: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { data: user })
})

// ------------------------------- Get Current User ----------------------------------
meRoutes.patch("/", async (c) => {
  const jwtPayload = c.get("jwtPayload")

  const payload = (await c.req.json()) as unknown
  const parsed = userUpdateSchema.safeParse(payload)

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

  // 1. Get current user first
  const currentUser = await prisma.user.findUnique({
    select: { username: true, email: true, id: true },
    where: { id: jwtPayload.userId },
  })

  if (!currentUser) {
    return jsonError(
      c,
      { message: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  // 2. Check conflicts only for fields being updated, excluding current user
  const conflict = await prisma.user.findFirst({
    where: {
      OR: [
        ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
        ...(parsed.data.username ? [{ username: parsed.data.username }] : []),
      ],
      id: { not: currentUser.id }, // exclude own row
    },
    select: { username: true, email: true },
  })

  if (conflict) {
    const fieldErrors: Record<string, string[]> = {}

    if (parsed.data.email && conflict.email === parsed.data.email) {
      fieldErrors.email = ["Email already exists"]
    }
    if (parsed.data.username && conflict.username === parsed.data.username) {
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

  const user = await prisma.user.update({
    where: { id: jwtPayload.userId },
    omit: { password: true },
    data: parsed.data,
  })
  return jsonSuccess(c, { data: user })
})

export default meRoutes
