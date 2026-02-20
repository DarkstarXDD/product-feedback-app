import { Hono } from "hono"

import type { HonoInstanceVariables } from "@/lib/types"

import { jsonSuccess, jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

const meRoutes = new Hono<{ Variables: HonoInstanceVariables }>()

// ------------------------------- Get Current User ----------------------------------
meRoutes.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload")

  const user = await prisma.user.findUnique({
    include: { suggestions: true, comments: true, upvotes: true, _count: true },
    where: { id: jwtPayload.userId },
    omit: { password: true },
  })

  if (!user) {
    return jsonError(
      c,
      { message: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { data: user })
})

export default meRoutes
