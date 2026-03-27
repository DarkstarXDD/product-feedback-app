import { Hono } from "hono"

import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { jsonSuccess, forbidden, notFound } from "@/lib/responses"
import { commentUpdateSchema } from "@/schemas/comment.schema"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { zodValidator } from "@/middlewares/zod-validator"
import { getUserOrThrow } from "@/lib/context-helpers"
import { buildPagination } from "@/lib/pagination"
import { Prisma, prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get(
  "/",
  resolveAuthUser,
  requireRole("ADMIN"),
  zodValidator("query", paginationSchema),
  async (c) => {
    const { pageSize, page } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const [totalItems, comments] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({
        select: commentSelect,
        take: pageSize,
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

// ------------------------------- GET a Comment --------------------------------
commentsRouter.get("/:id", async (c) => {
  const commentId = c.req.param("id")

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: commentSelect,
  })

  if (!comment) {
    return notFound(c, "Comment not found")
  }

  return jsonSuccess(c, { data: comment }, { status: 200 })
})

// ------------------------------- Update a Comment --------------------------------
commentsRouter.patch(
  "/:id",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", commentUpdateSchema),
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
        return forbidden(c, "Not allowed or forbidden")
      }

      throw e
    }
  }
)

export default commentsRouter
