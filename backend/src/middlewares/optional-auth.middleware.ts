import type { MiddlewareHandler } from "hono"

import { getCookie } from "hono/cookie"
import { verify } from "hono/jwt"

import type { AppContext } from "@/lib/types"
import type { JwtPayload } from "@/lib/types"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

export const optionalAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const token = getCookie(c, "token")

  if (token) {
    try {
      const jwtPayload = (await verify(token, JWT_SECRET, {
        alg: "HS256",
      })) as JwtPayload

      c.set("jwtPayload", jwtPayload)
    } catch {
      // Ignore
    }
  }

  await next()
}
