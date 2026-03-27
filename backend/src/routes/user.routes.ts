import { Hono } from "hono"

import type { AppContext } from "@/lib/types"

import { privateUserSelect, publicUserSelect } from "@/lib/selects/user.select"
import { withTargetAccess } from "@/middlewares/with-target-access.middleware"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { suggestionSelect } from "@/lib/selects/suggestion.select"
import { jsonSuccess, jsonError, notFound } from "@/lib/responses"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { getTargetUserOrThrow } from "@/lib/context-helpers"
import { zodValidator } from "@/middlewares/zod-validator"
import { userUpdateSchema } from "@/schemas/user.schema"
import { buildPagination } from "@/lib/pagination"
import { prisma } from "@/db/client"

const userRoutes = new Hono<AppContext>()

// ------------------------------- Get All Users --------------------------------
userRoutes.get(
  "/",
  resolveAuthUser,
  requireRole("ADMIN"),
  zodValidator("query", paginationSchema),
  async (c) => {
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const [totalItems, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: privateUserSelect,
        take: pageSize,
        skip,
      }),
    ])

    return jsonSuccess(c, {
      meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
      data: users,
    })
  }
)

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
    return notFound(c, "User not found")
  }

  return jsonSuccess(c, { data: user })
})

// --------------------------------- Update a User ------------------------------
userRoutes.patch(
  "/:username",
  resolveAuthUser,
  withTargetAccess({ requireSelfOrAdmin: true }),
  zodValidator("json", userUpdateSchema),
  async (c) => {
    const targetUser = getTargetUserOrThrow(c)
    const parsedData = c.req.valid("json")

    // Check conflicts only for fields being updated, excluding target user
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          ...(parsedData.email ? [{ email: parsedData.email }] : []),
          ...(parsedData.username ? [{ username: parsedData.username }] : []),
        ],
        id: { not: targetUser.id },
      },
      select: { username: true, email: true },
    })

    if (conflict) {
      const fieldErrors: Record<string, string[]> = {}

      if (parsedData.email && conflict.email === parsedData.email) {
        fieldErrors.email = ["Email already exists"]
      }
      if (parsedData.username && conflict.username === parsedData.username) {
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
      data: parsedData,
    })
    return jsonSuccess(c, { data: user })
  }
)

// ---------------------------- Get All Suggestions of a User -------------------------
userRoutes.get(
  "/:username/suggestions",
  resolveAuthUser,
  zodValidator("query", paginationSchema),
  async (c) => {
    const username = c.req.param("username")
    const user = c.get("user")
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const [totalItems, suggestions] = await Promise.all([
      prisma.suggestion.count({
        where: { user: { username } },
      }),
      prisma.suggestion.findMany({
        select: {
          ...suggestionSelect,
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

    const data = suggestions.map((suggestion) => {
      const viewerHasUpvoted =
        user && "upvotes" in suggestion ? suggestion.upvotes.length > 0 : false
      const { upvotes: _upvotes, ...suggestionData } = suggestion

      return {
        ...suggestionData,
        viewerHasUpvoted,
      }
    })

    return jsonSuccess(
      c,
      {
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data,
      },
      { status: 200 }
    )
  }
)

// ---------------------------- Get All Upvoted Suggestions of a User -------------------------
userRoutes.get(
  "/:username/upvotes",
  resolveAuthUser,
  zodValidator("query", paginationSchema),
  async (c) => {
    const username = c.req.param("username")
    const user = c.get("user")
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const where = {
      upvotes: {
        some: {
          user: { username },
        },
      },
    } as const

    const [totalItems, suggestions] = await Promise.all([
      prisma.suggestion.count({ where }),
      prisma.suggestion.findMany({
        select: {
          ...suggestionSelect,
          ...(user
            ? {
                upvotes: {
                  where: { userId: user.id },
                  select: { id: true },
                },
              }
            : {}),
        },
        take: pageSize,
        where,
        skip,
      }),
    ])

    const data = suggestions.map((suggestion) => {
      const viewerHasUpvoted =
        user && "upvotes" in suggestion ? suggestion.upvotes.length > 0 : false
      const { upvotes: _upvotes, ...suggestionData } = suggestion

      return {
        ...suggestionData,
        viewerHasUpvoted,
      }
    })

    return jsonSuccess(
      c,
      {
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data,
      },
      { status: 200 }
    )
  }
)

// ------------------------------- GET All Comments of a User --------------------------------
userRoutes.get(
  "/:username/comments",
  zodValidator("query", paginationSchema),
  async (c) => {
    const username = c.req.param("username")
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const [totalItems, comments] = await Promise.all([
      prisma.comment.count({ where: { user: { username } } }),
      prisma.comment.findMany({
        select: commentSelect,
        take: pageSize,
        where: { user: { username } },
        skip,
      }),
    ])

    return jsonSuccess(
      c,
      {
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data: comments,
      },
      { status: 200 }
    )
  }
)

export default userRoutes
