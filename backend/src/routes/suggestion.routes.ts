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
import { commentSelect } from "@/lib/selects/comments.select"
import { getUserOrThrow } from "@/lib/context-helpers"
import { Prisma } from "@/db/client"
import { prisma } from "@/db/client"

const suggestionRoutes = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRoutes.get("/", async (c) => {
  const suggestions = await prisma.suggestion.findMany({
    select: suggestionListSelect,
  })

  return jsonSuccess(c, { data: suggestions }, { status: 200 })
})

// ------------------------------- GET a Suggestion --------------------------------
suggestionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const suggestion = await prisma.suggestion.findUnique({
    select: suggestionSelect,
    where: { slug },
  })

  if (!suggestion) {
    return jsonError(
      c,
      { message: "Suggestion not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { data: suggestion }, { status: 200 })
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

// ------------------------------- Get All Comments for a Suggestion --------------------------------
suggestionRoutes.get("/:slug/comments", async (c) => {
  const slug = c.req.param("slug")

  const comments = await prisma.comment.findMany({
    where: { suggestion: { slug } },
    select: commentSelect,
  })

  return jsonSuccess(c, { data: comments })
})

// Delete suggestion is not yet implemented.

export default suggestionRoutes
