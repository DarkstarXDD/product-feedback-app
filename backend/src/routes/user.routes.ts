import { Hono } from "hono"

import type { AppContext } from "@/lib/types"

import {
  adminUserListSelect,
  privateUserSelect,
  publicUserSelect,
} from "@/lib/selects/user.selects"
import {
  type Pagination,
  formatZodErrors,
  jsonSuccess,
  jsonError,
} from "@/lib/utils"
import { withTargetAccess } from "@/middlewares/with-target-access.middleware"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { suggestionListSelect } from "@/lib/selects/suggestion.selects"
import { requireRole } from "@/middlewares/require-role.middleware"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { getTargetUserOrThrow } from "@/lib/context-helpers"
import { userUpdateSchema } from "@/schemas/user.schema"
import { prisma } from "@/db/client"

const userRoutes = new Hono<AppContext>()

// ------------------------------- Get All Users --------------------------------
userRoutes.get("/", resolveAuthUser, requireRole("ADMIN"), async (c) => {
  const users = await prisma.user.findMany({
    select: adminUserListSelect,
  })
  return jsonSuccess(c, { data: users })
})

// ------------------------------- Get a User ----------------------------------
userRoutes.get("/:username", resolveAuthUser, withTargetAccess(), async (c) => {
  const access = c.get("access")
  const targetUser = getTargetUserOrThrow(c)

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
})

// --------------------------------- Update a User ------------------------------
userRoutes.patch(
  "/:username",
  resolveAuthUser,
  withTargetAccess({ requireSelfOrAdmin: true }),
  async (c) => {
    const targetUser = getTargetUserOrThrow(c)

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
      select: privateUserSelect,
      data: parsed.data,
    })
    return jsonSuccess(c, { data: user })
  }
)

// ---------------------------- Get All Suggestions of a User -------------------------
userRoutes.get("/:username/suggestions", resolveAuthUser, async (c) => {
  const username = c.req.param("username")
  const user = c.get("user")
  const query = c.req.query()
  const parsedQuery = paginationSchema.safeParse(query)

  if (!parsedQuery.success) {
    return jsonError(
      c,
      {
        errors: formatZodErrors(parsedQuery.error),
        message: "Server validation fails",
        code: "VALIDATION_ERROR",
      },
      { status: 400 }
    )
  }

  const { pageSize, page } = parsedQuery.data
  const skip = (page - 1) * pageSize

  const [totalItems, suggestions] = await Promise.all([
    prisma.suggestion.count({
      where: { user: { username } },
    }),
    prisma.suggestion.findMany({
      select: {
        ...suggestionListSelect,
        ...(user
          ? {
              upvotes: {
                where: { userId: user.id },
                select: { id: true },
              },
            }
          : {}),
      },
      where: { user: { username } },
      take: pageSize,
      skip,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const data = suggestions.map((suggestion) => {
    const viewerHasUpvoted =
      user && "upvotes" in suggestion ? suggestion.upvotes.length > 0 : false
    const { upvotes: _upvotes, ...suggestionData } = suggestion

    return {
      ...suggestionData,
      viewerHasUpvoted,
    }
  })

  const pagination: Pagination = {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totalItems,
    totalPages,
    pageSize,
    page,
  }

  return jsonSuccess(c, { meta: { pagination }, data }, { status: 200 })
})

// ---------------------------- Get All Upvoted Suggestions of a User -------------------------
userRoutes.get("/:username/upvotes", resolveAuthUser, async (c) => {
  const username = c.req.param("username")
  const user = c.get("user")

  const suggestions = await prisma.suggestion.findMany({
    select: {
      ...suggestionListSelect,
      ...(user
        ? {
            upvotes: {
              where: { userId: user.id },
              select: { id: true },
            },
          }
        : {}),
    },
    where: {
      upvotes: {
        some: {
          user: { username },
        },
      },
    },
  })

  const data = suggestions.map((suggestion) => {
    const viewerHasUpvoted =
      user && "upvotes" in suggestion ? suggestion.upvotes.length > 0 : false
    const { upvotes: _upvotes, ...suggestionData } = suggestion

    return {
      ...suggestionData,
      viewerHasUpvoted,
    }
  })

  return jsonSuccess(c, { data }, { status: 200 })
})

// ------------------------------- GET All Comments of a User --------------------------------
userRoutes.get("/:username/comments", async (c) => {
  const username = c.req.param("username")

  const comments = await prisma.comment.findMany({
    where: { user: { username } },
    select: commentSelect,
  })

  return jsonSuccess(c, { data: comments }, { status: 200 })
})

export default userRoutes
