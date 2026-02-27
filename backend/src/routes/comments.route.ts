import { Hono } from "hono"

import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { commentsListSelect } from "@/lib/selects/comments.select"
import { jsonSuccess } from "@/lib/utils"
import { prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get("/", resolveAuthUser, requireRole("ADMIN"), async (c) => {
  const comments = await prisma.comment.findMany({
    select: commentsListSelect,
  })

  return jsonSuccess(c, { data: comments }, { status: 200 })
})

export default commentsRouter
