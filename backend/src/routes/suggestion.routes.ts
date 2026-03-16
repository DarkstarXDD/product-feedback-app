import { Hono } from "hono"

import {
  suggestionCreateSelect,
  suggestionListSelect,
  suggestionSelect,
} from "@/lib/selects/suggestion.selects"
import {
  formatZodErrors,
  generateSlug,
  jsonSuccess,
  jsonError,
} from "@/lib/utils"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { suggestionCreateSchema } from "@/schemas/suggestion.schema"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentCreateSchema } from "@/schemas/comments.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { upvoteSelect } from "@/lib/selects/upvote.selects"
import { getUserOrThrow } from "@/lib/context-helpers"
import { Prisma } from "@/db/client"
import { prisma } from "@/db/client"

const suggestionRoutes = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRoutes.get("/", resolveAuthUser, async (c) => {
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
  async (c) => {
    const user = getUserOrThrow(c)
    const payload = (await c.req.json()) as unknown
    const parsed = suggestionCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(parsed.error),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        ...parsed.data,
        slug: generateSlug(parsed.data.title),
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
  async (c) => {
    const user = getUserOrThrow(c)

    const slug = c.req.param("slug")
    const payload = (await c.req.json()) as unknown
    const parsed = suggestionCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(parsed.error),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const where = user.role === "ADMIN" ? { slug } : { userId: user.id, slug }

    try {
      const suggestion = await prisma.suggestion.update({
        select: suggestionCreateSelect,
        data: { ...parsed.data },
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
    }
  }
)

// ------------------------------- Create a Comment for a Suggestion --------------------------------
suggestionRoutes.post(
  "/:slug/comments",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const slug = c.req.param("slug")

    const user = getUserOrThrow(c)
    const payload = (await c.req.json()) as unknown
    const parsed = commentCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(parsed.error),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    /** Can't use connect if at least one foreign key is used directly.
     *  So both suggestion and user needs to use the `connect` appraoch.
     *  https://www.prisma.io/docs/orm/reference/prisma-client-reference#examples-28
     */
    const comment = await prisma.comment.create({
      data: {
        user: { connect: { id: user.id } },
        suggestion: { connect: { slug } },
        content: parsed.data.content,
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
