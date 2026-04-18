import type { JwtVariables } from "hono/jwt"

import type { PrivateUser } from "@/lib/selects/user.select"
import type { JWTPayload } from "@/lib/session"

export type Role = "ADMIN" | "USER"

export type HonoInstanceVariables = {
  user?: PrivateUser
  access: { isAdmin: boolean; isSelf: boolean }
  targetUser: { id: string; username: string }
} & JwtVariables<JWTPayload | undefined>

export type AppContext = {
  Variables: HonoInstanceVariables
}

/**
 * Recursively replaces `Date` with `string` to model JSON serialization.
 * Prisma returns `Date` objects, but they serialize to ISO strings over HTTP.
 */
export type Serialize<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Serialize<U>>
    : T extends object
      ? { [K in keyof T]: Serialize<T[K]> }
      : T
