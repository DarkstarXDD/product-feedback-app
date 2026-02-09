import { Hono } from "hono"

import { jsonSuccess, jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

const userRoutes = new Hono()

userRoutes.get("/", async (c) => {
  const users = await prisma.user.findMany({
    include: { suggestions: true, comments: true, upvotes: true, _count: true },
    omit: { updatedAt: true, password: true },
  })
  return jsonSuccess(c, { users })
})

userRoutes.get("/:username", async (c) => {
  const { username } = c.req.param()
  const user = await prisma.user.findUnique({
    include: { suggestions: true, comments: true, upvotes: true, _count: true },
    omit: { updatedAt: true, password: true },
    where: { username },
  })

  if (!user) {
    return jsonError(
      c,
      { message: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { user })
})

export default userRoutes
