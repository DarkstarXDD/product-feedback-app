import { Hono } from "hono"

import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentCreateSchema } from "@/schemas/comments.schema"
import { commentSelect } from "@/lib/selects/comments.select"
import { getUserOrThrow } from "@/lib/context-helpers"
import { jsonSuccess, jsonError } from "@/lib/utils"
import { Prisma, prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get("/", resolveAuthUser, requireRole("ADMIN"), async (c) => {
  const comments = await prisma.comment.findMany({
    select: commentSelect,
  })

  return jsonSuccess(c, { data: comments }, { status: 200 })
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
        { message: "Server validation fails", code: "VALIDATION_ERROR" },
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
          { message: "Not allowed or foribidden", code: "NOT_FOUND" },
          { status: 404 }
        )
      }
    }
  }
)

export default commentsRouter
