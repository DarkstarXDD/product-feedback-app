import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

export const computeAccessFlags: MiddlewareHandler<AppContext> = async (
  c,
  next
) => {
  const user = c.get("user")
  const target = c.get("targetUser")

  const isAdmin = user?.role === "ADMIN"
  const isSelf = !!user && !!target && user.id === target.id

  c.set("access", { isAdmin, isSelf })
  await next()
}
