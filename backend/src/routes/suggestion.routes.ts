import { describeRoute, resolver } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import {
  suggestionWithViewerUpvoteResponseSchema,
  suggestionWithCommentsResponseSchema,
  suggestionCreateResponseSchema,
  suggestionUpdateResponseSchema,
  suggestionCreateSchema,
  suggestionUpdateSchema,
} from "@/schemas/suggestion.schema"
import {
  suggestionWithCommentsAndViewerUpvoteSelect,
  suggestionWithViewerUpvoteSelect,
  suggestionWithCommentsSelect,
  suggestionCreateSelect,
  suggestionUpdateSelect,
  suggestionBaseSelect,
} from "@/lib/selects/suggestion.select"
import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
import {
  commentResponseSchema,
  commentCreateSchema,
} from "@/schemas/comment.schema"
import { mapSuggestionWithUpvoteStatus } from "@/lib/mappers/suggestion.mapper"
import { jsonSuccess, forbidden, conflict, notFound } from "@/lib/responses"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { upvoteResponseSchema } from "@/schemas/upvote.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { upvoteSelect } from "@/lib/selects/upvote.select"
import { zodValidator } from "@/middlewares/zod-validator"
import { getUserOrThrow } from "@/lib/context-helpers"
import { buildPagination } from "@/lib/pagination"
import { generateSlug } from "@/lib/utils"
import { Prisma } from "@/db/client"
import { prisma } from "@/db/client"

const suggestionRouter = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRouter.get(
  "/",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Get All Suggestions",
    description: "Returns a paginated list of suggestions.",
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
        description:
          "Bad Request. Occurs when the query parameters fail validation.",
      },
    },
  }),
  resolveAuthUser,
  zodValidator("query", paginationSchema),
  async (c) => {
    const user = c.get("user")
    const { pageSize, page } = c.req.valid("query")

    const [totalItems, suggestions] = await Promise.all([
      prisma.suggestion.count(),
      prisma.suggestion.findMany({
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: user
          ? suggestionWithViewerUpvoteSelect(user.id)
          : suggestionBaseSelect,
      }),
    ])

    return jsonSuccess(
      c,
      {
        data: suggestions.map(mapSuggestionWithUpvoteStatus),
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
      },
      { status: 200 }
    )
  }
)

// ------------------------------- GET a Suggestion --------------------------------
suggestionRouter.get(
  "/:slug",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Get a Suggestion",
    description:
      "Returns a single suggestion by slug, including maximum of 10 comments. Use /:slug/comments to load all the comments.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(
              jsonSuccessSchema(suggestionWithCommentsResponseSchema)
            ),
          },
        },
        description: "Successfully retrieved suggestion.",
      },
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Suggestion does not exist.",
      },
    },
  }),
  resolveAuthUser,
  async (c) => {
    const slug = c.req.param("slug")
    const user = c.get("user")

    const suggestion = await prisma.suggestion.findUnique({
      where: { slug },
      select: user
        ? suggestionWithCommentsAndViewerUpvoteSelect(user.id)
        : suggestionWithCommentsSelect,
    })

    if (!suggestion) {
      return notFound(c, "Suggestion not found")
    }

    return jsonSuccess(
      c,
      { data: mapSuggestionWithUpvoteStatus(suggestion) },
      { status: 200 }
    )
  }
)

// ------------------------------- Create a Suggestion --------------------------------
suggestionRouter.post(
  "/",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Create a Suggestion",
    description: "Creates a new suggestion.",
    responses: {
      201: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(suggestionCreateResponseSchema)),
          },
        },
        description: "Successfully created suggestion.",
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
        description: "Forbidden. User does not have the required role.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", suggestionCreateSchema),
  async (c) => {
    const user = getUserOrThrow(c)
    const parsedData = c.req.valid("json")

    const suggestion = await prisma.suggestion.create({
      data: {
        ...parsedData,
        slug: generateSlug(parsedData.title),
        userId: user.id,
      },
      select: suggestionCreateSelect,
    })

    return jsonSuccess(c, { data: suggestion }, { status: 201 })
  }
)

// ------------------------------- Update a Suggestion --------------------------------
suggestionRouter.patch(
  "/:slug",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Update a Suggestion",
    description: "Updates an existing suggestion by slug.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(suggestionUpdateResponseSchema)),
          },
        },
        description: "Successfully updated suggestion.",
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
        description: "Forbidden. User does not own the suggestion.",
      },
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Suggestion does not exist.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", suggestionUpdateSchema),
  async (c) => {
    const user = getUserOrThrow(c)
    const slug = c.req.param("slug")
    const parsedData = c.req.valid("json")

    const existing = await prisma.suggestion.findUnique({
      select: { id: true },
      where: { slug },
    })

    if (!existing) {
      return notFound(c, "Suggestion not found")
    }

    try {
      const suggestion = await prisma.suggestion.update({
        data: { ...parsedData },
        where: user.role === "ADMIN" ? { slug } : { userId: user.id, slug },
        select: suggestionUpdateSelect,
      })
      return jsonSuccess(c, { data: suggestion }, { status: 200 })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return forbidden(c, "Not allowed or forbidden")
      }
      throw e
    }
  }
)

// ------------------------------- Create a Comment for a Suggestion --------------------------------
suggestionRouter.post(
  "/:slug/comments",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Create a Comment",
    description: "Creates a new comment on a suggestion.",
    responses: {
      201: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(commentResponseSchema)),
          },
        },
        description: "Successfully created comment.",
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
        description: "Forbidden. User does not have the required role.",
      },
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Suggestion does not exist.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", commentCreateSchema),
  async (c) => {
    const slug = c.req.param("slug")
    const user = getUserOrThrow(c)
    const parsedData = c.req.valid("json")

    /** Can't use foreign key approach if one connect is used.
     *  So both suggestion and user needs to use the `connect` appraoch.
     *  https://www.prisma.io/docs/orm/reference/prisma-client-reference#examples-28
     */
    try {
      const comment = await prisma.comment.create({
        data: {
          user: { connect: { id: user.id } },
          suggestion: { connect: { slug } },
          content: parsedData.content,
        },
        select: commentSelect,
      })

      return jsonSuccess(c, { data: comment }, { status: 201 })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return notFound(c, "Suggestion not found")
      }
      throw e
    }
  }
)

// ------------------------------- Get All Comments for a Suggestion --------------------------------
suggestionRouter.get(
  "/:slug/comments",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Get All Comments for a Suggestion",
    description: "Returns a paginated list of comments for a suggestion.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(
              paginatedSuccessSchema(z.array(commentResponseSchema))
            ),
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
        description:
          "Bad Request. Occurs when the query parameters fail validation.",
      },
    },
  }),
  zodValidator("query", paginationSchema),
  async (c) => {
    const slug = c.req.param("slug")
    const { page, pageSize } = c.req.valid("query")

    const [totalItems, comments] = await Promise.all([
      prisma.comment.count({ where: { suggestion: { slug } } }),
      prisma.comment.findMany({
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where: { suggestion: { slug } },
        select: commentSelect,
      }),
    ])

    return jsonSuccess(c, {
      data: comments,
      meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
    })
  }
)

// ------------------------------- Create an Upvote for a Suggestion --------------------------------
suggestionRouter.post(
  "/:slug/upvotes",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Upvote a Suggestion",
    description: "Creates an upvote on a suggestion.",
    responses: {
      201: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(upvoteResponseSchema)),
          },
        },
        description: "Successfully upvoted suggestion.",
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
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Suggestion does not exist.",
      },
      409: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Conflict. Suggestion already upvoted.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const slug = c.req.param("slug")
    const user = getUserOrThrow(c)

    try {
      const upvote = await prisma.upvote.create({
        data: {
          suggestion: { connect: { slug } },
          user: { connect: { id: user.id } },
        },
        select: upvoteSelect,
      })

      return jsonSuccess(c, { data: upvote }, { status: 201 })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") return notFound(c, "Suggestion not found")
        if (e.code === "P2002") return conflict(c, "Suggestion already upvoted")
      }
      throw e
    }
  }
)

// ------------------------------- Delete an Upvote for a Suggestion --------------------------------
suggestionRouter.delete(
  "/:slug/upvotes",
  describeRoute({
    tags: ["Suggestions"],
    summary: "Remove an Upvote from a Suggestion",
    description: "Removes the current user's upvote from a suggestion.",
    responses: {
      204: {
        description: "Successfully removed upvote.",
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
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Upvote does not exist.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const slug = c.req.param("slug")
    const user = getUserOrThrow(c)

    /**
     * `delete` would need a unique clause like `id` or the compound
     * `userId + suggestionId`, but here we only have `userId` and the related
     * suggestion `slug`. `deleteMany` lets us filter by relation and use the
     * returned count to decide whether to return 204 or 404.
     */
    const deleted = await prisma.upvote.deleteMany({
      where: {
        suggestion: { slug },
        userId: user.id,
      },
    })

    if (deleted.count === 0) {
      return notFound(c, "Upvote not found")
    }

    return c.body(null, 204)
  }
)

// Delete suggestion is not yet implemented.

export default suggestionRouter
