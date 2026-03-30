import { describeRoute, resolver } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import type { AppContext } from "@/lib/types"

import {
  suggestionWithViewerUpvoteSelect,
  suggestionBaseSelect,
} from "@/lib/selects/suggestion.select"
import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
import { suggestionWithViewerUpvoteResponseSchema } from "@/schemas/suggestion.schema"
import { privateUserSelect, publicUserSelect } from "@/lib/selects/user.select"
import { mapSuggestionWithUpvoteStatus } from "@/lib/mappers/suggestion.mapper"
import { withTargetAccess } from "@/middlewares/with-target-access.middleware"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { privateUserResponseSchema } from "@/schemas/user.schema"
import { jsonSuccess, conflict, notFound } from "@/lib/responses"
import { commentResponseSchema } from "@/schemas/comment.schema"
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
  describeRoute({
    tags: ["Users"],
    summary: "Get All Users",
    description: "Returns a paginated list of all users. Admin only.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(paginatedSuccessSchema(privateUserResponseSchema)),
          },
        },
        description: "Successfully retrieved users.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Query parameters fail validation.",
      },
      401: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Unauthorized. User is not authenticated.",
      },
      403: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Forbidden. User does not have the required role.",
      },
    },
  }),
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
  describeRoute({
    tags: ["Users"],
    summary: "Update a User",
    description: "Updates an existing user by username.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(privateUserResponseSchema)),
          },
        },
        description: "Successfully updated user.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Request body fails validation.",
      },
      401: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Unauthorized. User is not authenticated.",
      },
      403: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Forbidden. User does not have access.",
      },
      409: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Conflict. Email or username already exists.",
      },
    },
  }),
  resolveAuthUser,
  withTargetAccess({ requireSelfOrAdmin: true }),
  zodValidator("json", userUpdateSchema),
  async (c) => {
    const targetUser = getTargetUserOrThrow(c)
    const parsedData = c.req.valid("json")

    // Check conflicts only for fields being updated, excluding target user
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(parsedData.email ? [{ email: parsedData.email }] : []),
          ...(parsedData.username ? [{ username: parsedData.username }] : []),
        ],
        id: { not: targetUser.id },
      },
      select: { username: true, email: true },
    })

    if (existing) {
      const fieldErrors: Record<string, string[]> = {}
      if (parsedData.email && existing.email === parsedData.email) {
        fieldErrors.email = ["Email already exists"]
      }
      if (parsedData.username && existing.username === parsedData.username) {
        fieldErrors.username = [
          "Username taken. Please pick a different username",
        ]
      }
      return conflict(c, "Unique constraint violation", { fieldErrors })
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
  describeRoute({
    tags: ["Users"],
    summary: "Get All Suggestions of a User",
    description: "Returns a paginated list of suggestions created by a user.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(
              paginatedSuccessSchema(
                z.array(suggestionWithViewerUpvoteResponseSchema)
              )
            ),
          },
        },
        description: "Successfully retrieved suggestions.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Query parameters fail validation.",
      },
    },
  }),
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
        select: user
          ? suggestionWithViewerUpvoteSelect(user.id)
          : suggestionBaseSelect,
        where: { user: { username } },
        take: pageSize,
        skip,
      }),
    ])

    return jsonSuccess(
      c,
      {
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data: suggestions.map(mapSuggestionWithUpvoteStatus),
      },
      { status: 200 }
    )
  }
)

// ---------------------------- Get All Upvoted Suggestions of a User -------------------------
userRoutes.get(
  "/:username/upvotes",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Upvoted Suggestions of a User",
    description: "Returns a paginated list of suggestions upvoted by a user.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(
              paginatedSuccessSchema(
                z.array(suggestionWithViewerUpvoteResponseSchema)
              )
            ),
          },
        },
        description: "Successfully retrieved upvoted suggestions.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Query parameters fail validation.",
      },
    },
  }),
  resolveAuthUser,
  zodValidator("query", paginationSchema),
  async (c) => {
    const username = c.req.param("username")
    const user = c.get("user")
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const where = { upvotes: { some: { user: { username } } } } as const

    const [totalItems, suggestions] = await Promise.all([
      prisma.suggestion.count({ where }),
      prisma.suggestion.findMany({
        select: user
          ? suggestionWithViewerUpvoteSelect(user.id)
          : suggestionBaseSelect,
        take: pageSize,
        where,
        skip,
      }),
    ])

    return jsonSuccess(
      c,
      {
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data: suggestions.map(mapSuggestionWithUpvoteStatus),
      },
      { status: 200 }
    )
  }
)

// ------------------------------- GET All Comments of a User --------------------------------
userRoutes.get(
  "/:username/comments",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Comments of a User",
    description: "Returns a paginated list of comments made by a user.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(paginatedSuccessSchema(commentResponseSchema)),
          },
        },
        description: "Successfully retrieved comments.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Query parameters fail validation.",
      },
    },
  }),
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
