import { Hono } from "hono"

import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentSelect } from "@/lib/selects/comments.select"
import { jsonSuccess, jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

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
  const id = c.req.param("id")

  const comment = await prisma.comment.findUnique({
    select: commentSelect,
    where: { id },
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

export default commentsRouter
