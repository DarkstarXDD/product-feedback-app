import { Hono } from "hono"

import {
  type Pagination,
  formatZodErrors,
  jsonSuccess,
  jsonError,
} from "@/lib/utils"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentCreateSchema } from "@/schemas/comments.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { getUserOrThrow } from "@/lib/context-helpers"
import { Prisma, prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get("/", resolveAuthUser, requireRole("ADMIN"), async (c) => {
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

  const [totalItems, comments] = await Promise.all([
    prisma.comment.count(),
    prisma.comment.findMany({
      select: commentSelect,
      take: pageSize,
      skip,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const pagination: Pagination = {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totalItems,
    totalPages,
    pageSize,
    page,
  }

  return jsonSuccess(
    c,
    { meta: { pagination }, data: comments },
    { status: 200 }
  )
})

// ------------------------------- GET a Comment --------------------------------
commentsRouter.get("/:id", async (c) => {
  const commentId = c.req.param("id")

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: commentSelect,
  })

  if (!comment) {
    return jsonError(
      c,
      { message: "Comment not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { data: comment }, { status: 200 })
})

// ------------------------------- Update a Comment --------------------------------
commentsRouter.patch(
  "/:id",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const commentId = c.req.param("id")
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

    const where =
      user.role === "ADMIN"
        ? { id: commentId }
        : { userId: user.id, id: commentId }

    try {
      const comment = await prisma.comment.update({
        data: { content: parsed.data.content },
        select: commentSelect,
        where,
      })

      return jsonSuccess(c, { data: comment }, { status: 200 })
    } catch (e) {
      console.log(e)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return jsonError(
          c,
          { message: "Not allowed or forbidden", code: "NOT_FOUND" },
          { status: 404 }
        )
      }

      throw e
    }
  }
)

export default commentsRouter
