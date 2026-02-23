import { Hono } from "hono"

import type { AppContext } from "@/lib/types"

import { privateUserSelect, publicUserSelect } from "@/lib/selects/user.selects"
import { withTargetAccess } from "@/middlewares/with-target-access.middleware"
// import { loadTargetUserByUsername } from "@/middlewares/load-target-user.middleware"
// import { computeAccessFlags } from "@/middlewares/compute-access-flags.middleware"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { formatZodErrors, jsonSuccess, jsonError } from "@/lib/utils"
// import { optionalAuth } from "@/middlewares/optional-auth.middleware"
// import { hydrateUser } from "@/middlewares/hydrate-user.middleware"
// import { requireAuth } from "@/middlewares/require-auth.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { userUpdateSchema } from "@/schemas/user.schema"
import { prisma } from "@/db/client"

const userRoutes = new Hono<AppContext>()

// ------------------------------- Get All Users --------------------------------
userRoutes.get(
  "/",
  resolveAuthUser,
  requireRole("ADMIN"),
  // requireAuth,
  // // optionalAuth,
  // computeAccessFlags,
  async (c) => {
    const users = await prisma.user.findMany({
      include: {
        suggestions: true,
        comments: true,
        upvotes: true,
        _count: true,
      },
      omit: { updatedAt: true, password: true },
    })
    return jsonSuccess(c, { data: users })
  }
)

// ------------------------------- Get a User ----------------------------------
userRoutes.get(
  "/:username",
  resolveAuthUser,
  withTargetAccess(),
  // optionalAuth,
  // hydrateUser,
  // loadTargetUserByUsername,
  // computeAccessFlags,
  async (c) => {
    const access = c.get("access")
    const targetUser = c.get("targetUser")
    if (!targetUser) {
      return jsonError(
        c,
        { message: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }

    const select =
      access && (access.isAdmin || access.isSelf)
        ? privateUserSelect
        : publicUserSelect

    const user = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select,
    })

    if (!user) {
      return jsonError(
        c,
        { message: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    return jsonSuccess(c, { data: user })
  }
)

// --------------------------------- Update a User ------------------------------
userRoutes.patch(
  "/:username",
  resolveAuthUser,
  withTargetAccess({ requireSelfOrAdmin: true }),
  async (c) => {
    const targetUser = c.get("targetUser")
    if (!targetUser) {
      return jsonError(
        c,
        { message: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }

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

    // Check conflicts only for fields being updated, excluding target user
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
          ...(parsed.data.username ? [{ username: parsed.data.username }] : []),
        ],
        id: { not: targetUser.id },
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
      where: { id: targetUser.id },
      omit: { password: true },
      data: parsed.data,
    })
    return jsonSuccess(c, { data: user })
  }
)

export default userRoutes
