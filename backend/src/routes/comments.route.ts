import { Hono } from "hono"

import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { type Pagination, jsonSuccess, jsonError } from "@/lib/utils"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentCreateSchema } from "@/schemas/comment.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { zodValidator } from "@/middlewares/zod-validator"
import { getUserOrThrow } from "@/lib/context-helpers"
import { Prisma, prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get(
  "/",
  resolveAuthUser,
  requireRole("ADMIN"),
  zodValidator("query", paginationSchema),
  async (c) => {
    const parsedQuery = c.req.valid("query")

    const { pageSize, page } = parsedQuery
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
  }
)

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
  zodValidator("json", commentCreateSchema),
  async (c) => {
    const commentId = c.req.param("id")
    const user = getUserOrThrow(c)
    const parsedData = c.req.valid("json")

    const where =
      user.role === "ADMIN"
        ? { id: commentId }
        : { userId: user.id, id: commentId }

    try {
      const comment = await prisma.comment.update({
        data: { content: parsedData.content },
        select: commentSelect,
        where,
      })

      return jsonSuccess(c, { data: comment }, { status: 200 })
    } catch (e) {
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
