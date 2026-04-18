import { describeRoute } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import {
  suggestionWithViewerUpvoteSelect,
  suggestionBaseSelect,
} from "@/lib/selects/suggestion.select"
import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/response.schema"
import { suggestionWithViewerUpvoteResponseSchema } from "@/schemas/suggestion.schema"
import { privateUserSelect, publicUserSelect } from "@/lib/selects/user.select"
import { mapSuggestionWithUpvoteStatus } from "@/lib/mappers/suggestion.mapper"
import { withTargetAccess } from "@/middleware/with-target-access"
import { privateUserResponseSchema } from "@/schemas/user.schema"
import { jsonSuccess, conflict, notFound } from "@/lib/responses"
import { resolveAuthUser } from "@/middleware/resolve-auth-user"
import { commentResponseSchema } from "@/schemas/comment.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { zodValidator } from "@/middleware/zod-validator"
import { userUpdateSchema } from "@/schemas/user.schema"
import { requireRole } from "@/middleware/require-role"
import { buildPagination } from "@/lib/pagination"
import { jsonResponse } from "@/lib/openapi"
import { prisma } from "@/db/client"

const usersRouter = new Hono()

// ------------------------------- Get All Users --------------------------------
usersRouter.get(
  "/",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Users",
    description: "Returns a paginated list of all users. Admin only.",
    responses: {
      200: jsonResponse(
        paginatedSuccessSchema(z.array(privateUserResponseSchema)),
        "Successfully retrieved users."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Query parameters fail validation."
      ),
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. User is not authenticated."
      ),
      403: jsonResponse(
        jsonErrorSchema,
        "Forbidden. User does not have the required role."
      ),
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
      data: users,
      meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
    })
  }
)

// ------------------------------- Get a User ----------------------------------
usersRouter.get(
  "/:username",
  describeRoute({
    tags: ["Users"],
    summary: "Get a User",
    description:
      "Returns a user by username. Admins and the user themselves receive the full response. Unauthenticated users or other users receive only `name` and `username`.",
    responses: {
      200: jsonResponse(
        jsonSuccessSchema(privateUserResponseSchema),
        "Successfully retrieved user."
      ),
      404: jsonResponse(jsonErrorSchema, "Not Found. User does not exist."),
    },
  }),
  resolveAuthUser,
  withTargetAccess(),
  async (c) => {
    const access = c.get("access")
    const targetUser = c.get("targetUser")

    const user = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select:
        access.isAdmin || access.isSelf ? privateUserSelect : publicUserSelect,
    })

    if (!user) {
      return notFound(c, "User not found")
    }

    return jsonSuccess(c, { data: user }, { status: 200 })
  }
)

// --------------------------------- Update a User ------------------------------
usersRouter.patch(
  "/:username",
  describeRoute({
    tags: ["Users"],
    summary: "Update a User",
    description: "Updates an existing user by username.",
    responses: {
      200: jsonResponse(
        jsonSuccessSchema(privateUserResponseSchema),
        "Successfully updated user."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Request body fails validation."
      ),
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. User is not authenticated."
      ),
      403: jsonResponse(
        jsonErrorSchema,
        "Forbidden. User does not have access."
      ),
      409: jsonResponse(
        jsonErrorSchema,
        "Conflict. Email or username already exists."
      ),
    },
  }),
  resolveAuthUser,
  withTargetAccess({ requireSelfOrAdmin: true }),
  zodValidator("json", userUpdateSchema),
  async (c) => {
    const targetUser = c.get("targetUser")
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
usersRouter.get(
  "/:username/suggestions",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Suggestions of a User",
    description: "Returns a paginated list of suggestions created by a user.",
    responses: {
      200: jsonResponse(
        paginatedSuccessSchema(
          z.array(suggestionWithViewerUpvoteResponseSchema)
        ),
        "Successfully retrieved suggestions."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Query parameters fail validation."
      ),
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
usersRouter.get(
  "/:username/upvotes",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Upvoted Suggestions of a User",
    description: "Returns a paginated list of suggestions upvoted by a user.",
    responses: {
      200: jsonResponse(
        paginatedSuccessSchema(
          z.array(suggestionWithViewerUpvoteResponseSchema)
        ),
        "Successfully retrieved upvoted suggestions."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Query parameters fail validation."
      ),
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
usersRouter.get(
  "/:username/comments",
  describeRoute({
    tags: ["Users"],
    summary: "Get All Comments of a User",
    description: "Returns a paginated list of comments made by a user.",
    responses: {
      200: jsonResponse(
        paginatedSuccessSchema(commentResponseSchema),
        "Successfully retrieved comments."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Query parameters fail validation."
      ),
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

export default usersRouter
