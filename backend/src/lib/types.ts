import type { JwtVariables } from "hono/jwt"

type JwtPayload = { userId: string; exp: number }

export type HonoInstanceVariables = JwtVariables<JwtPayload>
