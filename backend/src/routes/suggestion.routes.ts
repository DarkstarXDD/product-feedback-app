import { Hono } from "hono"

import {
  suggestionCreateSelect,
  suggestionListSelect,
  suggestionSelect,
} from "@/lib/selects/suggestion.selects"
import {
  suggestionCreateSchema,
  suggestionUpdateSchema,
} from "@/schemas/suggestion.schema"
import {
  type Pagination,
  generateSlug,
  jsonSuccess,
  jsonError,
} from "@/lib/utils"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentCreateSchema } from "@/schemas/comments.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { upvoteSelect } from "@/lib/selects/upvote.selects"
import { zodValidator } from "@/middlewares/zod-validator"
import { getUserOrThrow } from "@/lib/context-helpers"
import { Prisma } from "@/db/client"
import { prisma } from "@/db/client"

const suggestionRoutes = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRoutes.get(
  "/",
  resolveAuthUser,
  zodValidator("query", paginationSchema),
  async (c) => {
    const user = c.get("user")
    const parsedQuery = c.req.valid("query")

    const { pageSize, page } = parsedQuery
    const skip = (page - 1) * pageSize

    const [totalItems, suggestions] = await Promise.all([
      prisma.suggestion.count(),
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
  }
)

// ------------------------------- GET a Suggestion --------------------------------
suggestionRoutes.get("/:slug", resolveAuthUser, async (c) => {
  const slug = c.req.param("slug")
  const user = c.get("user")

  const suggestion = await prisma.suggestion.findUnique({
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
    where: { slug },
  })

  if (!suggestion) {
    return jsonError(
      c,
      { message: "Suggestion not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  const viewerHasUpvoted =
    user && "upvotes" in suggestion ? suggestion.upvotes.length > 0 : false
  const { upvotes: _upvotes, ...suggestionData } = suggestion

  return jsonSuccess(
    c,
    {
      data: {
        ...suggestionData,
        viewerHasUpvoted,
      },
    },
    { status: 200 }
  )
})

// ------------------------------- Create a Suggestion --------------------------------
suggestionRoutes.post(
  "/",
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
suggestionRoutes.patch(
  "/:slug",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", suggestionUpdateSchema),
  async (c) => {
    const user = getUserOrThrow(c)
    const slug = c.req.param("slug")
    const parsedData = c.req.valid("json")

    const where = user.role === "ADMIN" ? { slug } : { userId: user.id, slug }

    try {
      const suggestion = await prisma.suggestion.update({
        select: suggestionCreateSelect,
        data: { ...parsedData },
        where,
      })

      return jsonSuccess(c, { data: suggestion })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025" // https://www.prisma.io/docs/orm/reference/error-reference#p2025
      ) {
        return jsonError(
          c,
          {
            message: "Not found or forbidden",
            code: "NOT_FOUND",
          },
          { status: 404 }
        )
      }

      throw e
    }
  }
)

// ------------------------------- Create a Comment for a Suggestion --------------------------------
suggestionRoutes.post(
  "/:slug/comments",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", commentCreateSchema),
  async (c) => {
    const slug = c.req.param("slug")
    const user = getUserOrThrow(c)
    const parsedData = c.req.valid("json")

    /** Can't use connect if at least one foreign key is used directly.
     *  So both suggestion and user needs to use the `connect` appraoch.
     *  https://www.prisma.io/docs/orm/reference/prisma-client-reference#examples-28
     */
    const comment = await prisma.comment.create({
      data: {
        user: { connect: { id: user.id } },
        suggestion: { connect: { slug } },
        content: parsedData.content,
      },
      select: commentSelect,
    })

    return jsonSuccess(c, { data: comment }, { status: 201 })
  }
)

// ------------------------------- Get All Comments for a Suggestion --------------------------------
suggestionRoutes.get("/:slug/comments", async (c) => {
  const slug = c.req.param("slug")

  const comments = await prisma.comment.findMany({
    where: { suggestion: { slug } },
    select: commentSelect,
  })

  return jsonSuccess(c, { data: comments })
})

// ------------------------------- Create an Upvote for a Suggestion --------------------------------
suggestionRoutes.post(
  "/:slug/upvotes",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const slug = c.req.param("slug")
    const user = getUserOrThrow(c)

    const suggestion = await prisma.suggestion.findUnique({
      select: { id: true },
      where: { slug },
    })

    if (!suggestion) {
      return jsonError(
        c,
        { message: "Suggestion not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    try {
      const upvote = await prisma.upvote.create({
        data: {
          suggestionId: suggestion.id,
          userId: user.id,
        },
        select: upvoteSelect,
      })

      return jsonSuccess(c, { data: upvote }, { status: 201 })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return jsonError(
          c,
          {
            message: "Suggestion already upvoted",
            code: "CONFLICT",
          },
          { status: 409 }
        )
      }

      throw e
    }
  }
)

// ------------------------------- Delete an Upvote for a Suggestion --------------------------------
suggestionRoutes.delete(
  "/:slug/upvotes",
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
      return jsonError(
        c,
        { message: "Upvote not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    return c.body(null, 204)
  }
)

// Delete suggestion is not yet implemented.

export default suggestionRoutes
