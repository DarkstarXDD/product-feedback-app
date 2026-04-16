import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { unauthorized } from "@/lib/responses"

/** Requires an authenticated user to be present in request context. */
export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get("user")

  if (!user) {
    return unauthorized(c)
  }

  await next()
}
